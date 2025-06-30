# 🎬 Demo Project Example

Copy and paste this example into your "Create Project" form to test the video generation system:

## Project Details (Step 1)

**Project Title:**
```
User Authentication System
```

**Description:**
```
A secure JWT-based authentication system with password hashing, token refresh, and role-based access control for modern web applications.
```

**Programming Language:**
```
JavaScript (or select from dropdown)
```

**Code Snippet:**
```javascript
// User Authentication Service
class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshTokens = new Map();
  }

  // Register new user with password hashing
  async registerUser(email, password, role = 'user') {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password with bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user
      const user = new User({
        email,
        password: hashedPassword,
        role,
        createdAt: new Date(),
        isActive: true
      });

      await user.save();
      
      // Generate tokens
      const tokens = this.generateTokens(user);
      
      return {
        user: this.sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Login with email and password
  async loginUser(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      return {
        user: this.sanitizeUser(user),
        ...tokens
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Generate JWT access and refresh tokens
  generateTokens(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    // Short-lived access token (15 minutes)
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '15m',
      issuer: 'auth-service'
    });

    // Long-lived refresh token (7 days)
    const refreshToken = jwt.sign(
      { userId: user._id }, 
      this.jwtSecret, 
      { expiresIn: '7d' }
    );

    // Store refresh token
    this.refreshTokens.set(user._id.toString(), refreshToken);

    return { accessToken, refreshToken };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      const storedToken = this.refreshTokens.get(decoded.userId);
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const newTokens = this.generateTokens(user);
      
      return newTokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Middleware for protecting routes
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, this.jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      req.user = decoded;
      next();
    });
  }

  // Role-based authorization middleware
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  // Remove sensitive data from user object
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }

  // Logout user and invalidate refresh token
  async logoutUser(userId) {
    this.refreshTokens.delete(userId);
    return { message: 'Logged out successfully' };
  }
}

// Usage Example
const authService = new AuthService();

// Express route handlers
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const result = await authService.registerUser(email, password, role);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Protected route example
app.get('/api/admin/users', 
  authService.authenticateToken,
  authService.requireRole(['admin']),
  async (req, res) => {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  }
);

module.exports = AuthService;
```

## Demo Configuration (Step 2)

**Demo Type:** Choose one of:
- ✅ **Code Walkthrough** (recommended for this example)
- Feature Pitch
- Tutorial

**Voice Style:** Choose one of:
- ✅ **Professional** (recommended for this example)
- Casual
- Enthusiastic

## Final Settings (Step 3)

**Customization Options:**
- ✅ **Include Code Visualization** (recommended)
- ✅ **Include Face-Talking Avatar** (optional - requires Tavus API key)

---

## 🎯 What This Demo Will Show

This example will generate a professional demo video that:

1. **Explains the Authentication System** - AI will analyze the code and create a compelling script
2. **Highlights Key Features** - JWT tokens, password hashing, role-based access
3. **Shows Code Structure** - Classes, methods, and security best practices
4. **Professional Narration** - Clear explanation of technical concepts
5. **Visual Code Display** - Syntax-highlighted code snippets (if enabled)
6. **Face Avatar** - AI presenter explaining the code (if Tavus is configured)

## 🔧 Expected Processing Steps

You'll see these steps in the processing interface:

1. ✅ **Initializing** - Project created in database
2. 🔄 **Generating AI Script** - AI analyzes your authentication code
3. 🎤 **Creating Voice Narration** - ElevenLabs generates professional voice
4. 👤 **Generating Face Video** - Tavus creates avatar (if enabled)
5. 🎞️ **Combining Video Elements** - Final video assembly
6. ✅ **Finalizing Video** - Ready to watch!

## 📊 What You'll Learn

This demo will help you verify:
- ✅ AI script generation quality
- ✅ Voice synthesis clarity
- ✅ Processing time (typically 2-5 minutes)
- ✅ Final video quality
- ✅ Error handling and logging
- ✅ Database integration

## 🚀 Ready to Test?

1. Copy the **Project Title** above
2. Copy the **Description** above  
3. Select **JavaScript** as the language
4. Copy the entire **Code Snippet** above
5. Choose **Code Walkthrough** and **Professional** voice
6. Click "Generate Demo Video" and watch the magic happen!

The system will create a professional demo video explaining this authentication system with AI-generated script and voice narration.