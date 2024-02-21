require('dotenv').config() // Load environment variables from .env file

const fs = require('fs')
const marked = require('marked')
const ejs = require('ejs')
const Koa = require('koa')
const Router = require('koa-router')
const route = require('koa-route')
const bodyParser = require('koa-bodyparser')
const koaStatic = require('koa-static')
const session = require('koa-session')
const websockify = require('koa-websocket')
const pty = require('node-pty')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const passport = require('koa-passport')
const OIDCStrategy = require('passport-openidconnect').Strategy
const db = require('./db')
const event = require('./event')
const bridgeInfo = require('./bridgeInfo')

const app = websockify(new Koa())
const router = new Router()
const path = require('path')
const Ajv = require('ajv')
const ethernetToDecnet = require('./ethernetToDecnet')

const resolvePath = (...components) => path.join(__dirname, '..', ...components)

const readFileSync = (...components) =>
  fs.readFileSync(resolvePath(...components), { encoding: 'utf8' })

app.use(bodyParser())
app.use(koaStatic(resolvePath('public')))

// Session middleware
app.keys = [process.env.SESSION_SECRET]
app.use(session({}, app))
app.ws.use(session({}, app))

// Initialize passport middleware
const passportMiddleware = passport.initialize()
app.use(passportMiddleware)
app.ws.use(passportMiddleware)
const passportSession = passport.session()
app.use(passportSession)
app.ws.use(passportSession)

const verifyForumLogin = async (
  issuer,
  uiProfile,
  idProfile,
  context,
  idToken,
  accessToken,
  refreshToken,
  params,
  verified
) => {
  // The verify strategy callback must have this signature so that the raw
  // profile information is available in the `idProfile` parameter.

  const claims = uiProfile._json
  const username = claims.nickname.toLowerCase()
  const userId = await db.getUserId(username)
  if (!userId && !claims.rank?.match(/^(Fördermitglied|Schiedsrichter|Vereinsmitglied|Vorstand|Moderator|Administrator)$/)) {
    console.log('unauthorized forum user', username, claims.rank)
    return verified(null, false, { message: "Dieses System ist nur für Mitglieder des VzEkC e.V. zugänglich." })
  }
  event.publish(
    'web-login',
    `${username} hat sich über das Forum auf dem Webserver angemeldet.`,
    { username }
  )
  return verified(null, {
    username: username,
    id: userId,
  })
}

// GitHub OAuth2 configuration
passport.use(
  'oidc',
  new OIDCStrategy(
    {
      issuer: process.env.OIDC_ISSUER,
      clientID: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      callbackURL: process.env.OIDC_CALLBACK_URL,
      authorizationURL: process.env.OIDC_AUTHORIZATION_URL,
      tokenURL: process.env.OIDC_TOKEN_URL,
      userInfoURL: process.env.OIDC_USERINFO_URL,
      scope: [
        'openid',
        'nickname',
        'email',
        'rank',
        'profile',
      ],
    },
    verifyForumLogin
  )
)

const LocalStrategy = require('passport-local').Strategy

// Define the Local strategy for username/password authentication
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Call the checkUser function to verify the username/password
      const user = await db.checkPassword(username, password)

      if (user) {
        // If the user is found and the password is correct, return the user
        done(null, user)
      } else {
        // If the user is not found or the password is incorrect, return false
        done(null, false)
      }
    } catch (error) {
      done(error)
    }
  })
)

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user)
})

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user)
})

const isAuthenticated = async (ctx, next) => {
  if (ctx.isAuthenticated()) {
    await next()
  } else {
    if (ctx.accepts('html')) {
      ctx.redirect('/login?path=' + ctx.path)
    } else {
      ctx.status = 403
      ctx.body = 'Forbidden'
    }
  }
}

app.use(db.middleware)

const renderTemplate = (content, state, data) =>
  ejs.render(content, { ...state, ...(data || {}) })
const renderTemplateFile = (filename, state, data) =>
  renderTemplate(readFileSync('templates', filename), state, data)

router.get('/client-config/:installKey', async (ctx) => {
  const installKey = ctx.params.installKey?.toUpperCase()
  const configuration = await db.getConfigurationByInstallKey(
    ctx.db,
    installKey
  )

  if (configuration) {
    ctx.type = 'text/plain'
    ctx.body = renderTemplateFile('client-config.ejs', ctx.state, {
      ...configuration,
      ca_certificate: readFileSync('../ca/data', 'ca.crt'),
      ta_key: readFileSync('../ca/data', 'ta.key'),
    })
  } else {
    ctx.status = 404
    ctx.body = 'Configuration not found'
  }
})

const markdownOptions = {
  renderer: new marked.Renderer(),
  gfm: true,
  breaks: false,
}

router.get('/installation', isAuthenticated, async (ctx, next) => {
  const username = ctx.state.user.username

  ctx.state.installKey = await db.getInstallKeyByUser(ctx.db, username)

  await next()
})

router.get('/status', async (ctx, next) => {
  const protocols = await db.getProtocols()
  ctx.state.hosts = (await db.getActiveHosts()).map((host) => ({
    ...host,
    editable: ctx.state.user?.id === host.user_id,
    protocols: host.protocols?.sort().map((number) => {
      const protocol = protocols[number]
      return {
        name: protocol?.name || number.toString(16).toUpperCase(),
        description: protocol?.description,
      }
    }),
    decnet: ethernetToDecnet(host.mac_address),
  }))

  await next()
})

const getLatServices = async () => {
  const { stdout } = await exec('llogin -d')
  return stdout
    .trim()
    .split('\n')
    .map((line) => {
      const [_, name, status, description] = line.match(
        /^(\S+)\s+(\S+)\s+(.*)$/
      )
      return { name, status, description }
    })
    .filter(({ status }) => status === 'Available')
}

router.get('/lat', async (ctx, next) => {
  ctx.state.services = await getLatServices()
  await next()
})

router.get('/set-password', async (ctx, next) => {
  const key = ctx.request.query.key
  if (key) {
    ctx.state.keyValid = await db.checkPasswordResetKey(key)
    ctx.state.key = key
  } else {
    ctx.state.keyValid = false
    ctx.state.key = ''
  }
  next()
})

router.get('/login', (ctx, next) => {
  if (ctx.session.messages) {
    ctx.state.message = ctx.session.messages[0]
    delete ctx.session.messages
  } else {
    ctx.state.message = null
  }
  next()
})

router.get('/:page', (ctx, next) => {
  let content = null
  if (fs.existsSync(resolvePath('templates', `${ctx.params.page}.md`))) {
    content = marked.parse(
      renderTemplateFile(`${ctx.params.page}.md`, ctx.state),
      markdownOptions
    )
  } else if (
    fs.existsSync(resolvePath('templates', `${ctx.params.page}.html`))
  ) {
    content = renderTemplate(
      readFileSync('templates', `${ctx.params.page}.html`),
      ctx.state
    )
  }

  if (content) {
    // Send the HTML response
    ctx.type = 'text/html'
    ctx.body = renderTemplateFile('layout.ejs', ctx.state, {
      content,
      page_name: ctx.params.page,
    })
  } else {
    next()
  }
})

router.redirect('/', '/status')
router.redirect('/news', '/status')

router.get('/install.sh', (ctx) => {
  ctx.type = 'text/plain'
  ctx.body = renderTemplateFile('install.sh.ejs', ctx.state)
})

// host maintenance

router.get('/api/hosts', async (ctx) => {
  ctx.body = await db.getActiveHosts()
})

const validateHostUpdateSchema = new Ajv().compile({
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    hardware: { type: 'string' },
    software: { type: 'string' },
  },
  additionalProperties: false,
})

router.put('/api/host/:mac_address', isAuthenticated, async (ctx) => {
  const valid = validateHostUpdateSchema(ctx.request.body)

  if (!valid) {
    ctx.status = 400
    ctx.body = {
      message: 'schema validation errors',
      errors: validateHostUpdateSchema.errors,
    }
    return
  }

  await db.updateHost(
    ctx.state.user.username,
    ctx.params.mac_address,
    ctx.request.body
  )

  ctx.status = 204
})

router.get('/auth', passport.authenticate('oidc'))

router.get(
  '/auth/callback',
  passport.authenticate('oidc', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true,
  })
)

router.post('/auth/login', async (ctx, next) => {
  // Check if the request body contains username and password
  const { username, password } = ctx.request.body

  if (username && password) {
    // Attempt Local authentication
    await passport.authenticate('local', async (err, user, info) => {
      if (err) {
        ctx.status = 500
        ctx.body = 'Internal Server Error'
      } else if (!user) {
        if (ctx.accepts('html')) {
          ctx.redirect('/login?error=1&path=' + (ctx.request.query.path || '/'))
        } else {
          ctx.status = 403
        }
      } else {
        // If Local authentication succeeds, log in the user
        await ctx.login(user)
        ctx.redirect(ctx.request.query.path || '/')
        event.publish(
          'web-login',
          `${username} hat sich auf dem Webserver angemeldet.`,
          { username }
        )
      }
    })(ctx, next)
  } else {
    // If username or password is missing, attempt OIDC authentication
    await passport.authenticate('oidc')(ctx, next)
  }
})

router.post('/auth/set-password', async (ctx, next) => {
  if (ctx.request.body.key) {
    await db.resetPassword(ctx.request.body.key, ctx.request.body.password)
  } else if (ctx.state.user) {
    await db.setPassword(ctx.state.user.username, ctx.request.body.password)
  } else {
    ctx.status = 400
    return
  }
  ctx.redirect('/login?reset-success=1')
})

// Logout route
router.post('/logout', (ctx) => {
  if (ctx.state?.user?.username) {
    event.publish('web-logout', `${ctx.state.user.username} hat sich vom Webserver abgemeldet`)
  }
  ctx.logout(() => ctx.redirect('/'))
})

// WebSocket route
app.ws.use(
  route.all('/ws/lat/:host', async (ctx, host) => {
    const printOnTerminal = (message) =>
      ctx.websocket.send(`\x07\r\r\n\x1b[1m*** ${message} ***\x1b[0m\r\n\n`)

    if (!ctx.state.user) {
      console.log('unauthorized websocket connection')
      await printOnTerminal('Du bist nicht angemeldet.')
      setInterval(() => ctx.websocket.close(), 5000)
      return
    }

    console.log('new websocket connection to ', host)

    const username = ctx.state.user.username
    await event.publish(
      'lat-connect',
      `${username} hat eine LAT-Verbindung zu ${host} hergestellt`,
      { username, host }
    )

    await printOnTerminal(`Verbinde zu ${host}...`)
    const ptyProcess = pty.spawn(
      '/bin/bash',
      ['-c', `llogin -n "web.${username}" ${host}`],
      {
        name: 'vt100',
        env: process.env,
        cwd: process.env.HOME,
        cols: 80,
        rows: 24,
      }
    )

    ctx.websocket.on('message', (data) => ptyProcess.write(data))
    ctx.websocket.on('error', () => ptyProcess.kill())
    ctx.websocket.on('close', () => ptyProcess.kill())
    ptyProcess.on('data', (data) => ctx.websocket.send(data))
    ptyProcess.on('exit', async () => {
      printOnTerminal('Verbindung beendet')
      await event.publish(
        'lat-connect',
        `${username} hat die LAT-Verbindung zu ${host} beendet`,
         { username, host }
      )
      setInterval(() => ctx.websocket.close(), 5000)
    })
  })
)

app.ws.use(
  route.all('/ws/event-log', async (ctx) => {
    if (!ctx.state.user) {
      console.log('unauthorized websocket connection')
      setInterval(() => ctx.websocket.close(), 5000)
      return
    }

    const client = await db.connect()
    await client.query('LISTEN event')
    const sendEvent = async (event) => ctx.websocket.send(JSON.stringify(event))

    const result = await client.query(`SELECT *
                                       FROM event
                                       ORDER BY timestamp DESC
                                       LIMIT 50`)
    result.rows.reverse().forEach(sendEvent)

    client.removeAllListeners('notification')
    client.on('notification', async (msg) => {
      const result = await client.query(
        `SELECT *
         FROM event
         WHERE id = $1::integer`,
        [msg.payload]
      )
      sendEvent(result.rows[0])
    })
    ctx.websocket.on('message', () => undefined)
    ctx.websocket.on('close', () => client.release())
  })
)

app.use(router.routes())
app.use(router.allowedMethods())

bridgeInfo.startHostUpdater()

const port = process.env.PORT || 3000

app.listen(port, async () => {
  console.log(`Server running on port ${port}`)
  event.publish('server-start', 'Der Webserver wurde gestartet')
})
