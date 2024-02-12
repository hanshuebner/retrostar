require('dotenv').config() // Load environment variables from .env file

const Koa = require('koa')
const Router = require('koa-router')
const static = require('koa-static')
const session = require('koa-session')
const passport = require('koa-passport')
const GitHubStrategy = require('passport-github2').Strategy

const app = new Koa()
const router = new Router()

// Serve static files
app.use(static(__dirname + '/../public'))
console.log('static files:', __dirname + '/../public')

// Session middleware
app.keys = ['your-secret-key'] // Change this to a secret key for session encryption
app.use(session({}, app))

// Initialize passport middleware
app.use(passport.initialize())
app.use(passport.session())

// GitHub OAuth2 configuration
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      // Here you can save user profile data to a database
      return done(null, profile)
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

// Protected endpoint, requires authentication
router.get('/api/user', (ctx) => {
  if (ctx.isAuthenticated()) {
    ctx.body = `Hello, ${ctx.state.user.username}!`
  } else {
    ctx.status = 401
    ctx.body = 'Unauthorized'
  }
})

// GitHub authentication route
router.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
)

// GitHub authentication callback route
router.get(
  '/auth/github/callback',
  passport.authenticate('github', {
    successRedirect: '/',
    failureRedirect: '/',
  })
)

// Logout route
router.get('/logout', (ctx) => ctx.logout(() => ctx.redirect('/')))

app.use(router.routes())
app.use(router.allowedMethods())

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
