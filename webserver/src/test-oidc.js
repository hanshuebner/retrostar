require('dotenv').config() // Load environment variables from .env file

const Koa = require('koa')
const Router = require('koa-router')
const session = require('koa-session')
const passport = require('koa-passport')
const OIDCStrategy = require('passport-openidconnect').Strategy

const app = new Koa()
const router = new Router()

// Configure session middleware
app.keys = ['your-session-secret']
app.use(session({}, app))

// Initialize Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Configure Passport with OpenID Connect Strategy
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
      scope: 'openid email',
    },
    (tokenSet, userinfo, done) => {
      // You can process the user info here or save it in session
      return done(null, userinfo)
    }
  )
)

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user)
})

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user)
})

// Route to protect
router.get('/protected', passport.authenticate('oidc'), (ctx) => {
  ctx.body = 'Protected Resource'
})

// Authentication route
router.get('/auth', passport.authenticate('oidc'))

// Callback route after authentication
router.get(
  '/auth/callback',
  passport.authenticate('oidc', {
    successRedirect: '/protected',
    failureRedirect: '/',
  })
)

// Logout route
router.get('/logout', (ctx) => {
  ctx.logout()
  ctx.redirect('/')
})

// Home route
router.get('/', (ctx) => {
  ctx.body = 'Home Page'
})

// Use routes
app.use(router.routes())
app.use(router.allowedMethods())

// Start server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}/protected`)
})
