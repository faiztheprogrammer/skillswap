const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const Skill = require('./Models/Skill');
const User = require('./Models/User');
const Application = require('./Models/Application'); // Import Application model

const SECRET_KEY = 'your_jwt_secret';
const app = express();

const mongoURI = "mongodb+srv://faiz:faizrehman@cluster0.emkyqzi.mongodb.net/";

// Connect to MongoDB
mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve HTML, CSS, JS from /public

// JWT Verification Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (!token) return res.status(401).json({ message: 'Access denied. Token missing.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
    req.user = user; // Contains id and email from token
    next();
  });
}

// Routes
app.get('/', authenticateToken, (req, res) => {
  res.send("Welcome to SkillSwap!");
});

// Register a new user
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'That email is already associated with an account. Try a different one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: 'Registered successfully' });

  } catch (error) {
    console.error("❌ Error during registration:", error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Login (no token needed)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'No account found' });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, {
      expiresIn: '1h'
    });

    res.status(200).json({ message: 'Login successful', token });

  } catch (err) {
    console.error("❌ Error during login:", err.message);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Dashboard HTML
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Post a skill (auth required)
app.post('/skills', authenticateToken, async (req, res) => {
  try {
    const skillData = {
      offeredBy: req.body.offeredBy,
      skillOffered: req.body.skillOffered,
      wantsToLearn: req.body.wantsToLearn,
      userId: req.user.id
    };

    const newSkill = new Skill(skillData);
    const savedSkill = await newSkill.save();
    res.status(201).json(savedSkill);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all skills (auth not required)
app.get('/skills', async (req, res) => {
  try {
    const skills = await Skill.find({});
    res.json(skills);
  } catch (err) {
    res.status(500).send('Error fetching skills');
  }
});

// Get logged-in user's skills
app.get('/my-skills', authenticateToken, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.id });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a skill by ID
app.delete('/skills/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Skill.findByIdAndDelete(req.params.id);
    if (deleted) {
      res.status(200).json({ message: 'Skill deleted' });
    } else {
      res.status(404).json({ message: 'Skill not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a skill by ID
app.put('/skills/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updated) {
      res.status(200).json(updated);
    } else {
      res.status(404).json({ message: 'Skill not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get skill details (for edit form)
app.get('/skills/:id', authenticateToken, async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (skill) {
      res.json(skill);
    } else {
      res.status(404).json({ message: 'Skill not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Update an application's status (e.g., Accept/Reject)
app.put('/applications/:applicationId/status', authenticateToken, async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body; // Expecting { status: 'Accepted' } or { status: 'Rejected' }

  // Basic validation
  if (!status || !['Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status: status },
      { new: true } 
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    res.status(200).json({ message: 'Status updated successfully', application });

  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ message: 'Server error while updating status.' });
  }
});



// Apply route
// Apply to a skill (auth required)
app.post('/apply', authenticateToken, async (req, res) => {
  const { skillId, message } = req.body;

  if (!skillId || !message) {
    return res.status(400).json({ success: false, message: "Missing skillId or message" });
  }

  try {
    const skill = await Skill.findById(skillId);
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }

    // ✅ Save the application
    const application = new Application({
      applicantId: req.user.id,
      skillId,
      message
    });

    await application.save();

    console.log(`📩 New application by user ${req.user.email} for skill ${skillId}: ${message}`);
    res.status(201).json({ success: true, message: "Application submitted successfully" });

  } catch (err) {
    console.error("❌ Error applying for skill:", err.message);
    res.status(500).json({ success: false, message: "Server error while applying" });
  }
});





// Route to get applications received by the logged-in user's skills
app.get('/received-applications', authenticateToken, async (req, res) => {
  try {
    // First, find all skills owned by the logged-in user
    const mySkills = await Skill.find({ userId: req.user.id });

    const skillIds = mySkills.map(skill => skill._id);

    // Now, find applications for those skills
    const applications = await Application.find({ skillId: { $in: skillIds } })
      .populate('applicantId', 'email')
      .populate('skillId', 'skillOffered');

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});


// --- ADD THIS NEW ROUTE TO APP.JS ---

// Update an application's status (e.g., Accept/Reject)
app.put('/applications/:applicationId/status', authenticateToken, async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body; // Expecting { status: 'Accepted' } or { status: 'Rejected' }

  // Basic validation
  if (!status || !['Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    // Find the application and update it
    const application = await Application.findByIdAndUpdate(
      applicationId,
      { status: status }, // The data to update
      { new: true } // This option returns the updated document
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    // Optional: Check if the user updating this is the owner of the skill
    // (This is an advanced security check you could add later)

    res.status(200).json({ message: 'Status updated successfully', application });

  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ message: 'Server error while updating status.' });
  }
});

// --- END OF NEW ROUTE ---

// My Applications - Applications made by logged-in user
app.get('/my-applications', authenticateToken, async (req, res) => {
  try {
    const applications = await Application.find({ applicantId: req.user.id })
      .populate('skillId') // just include the skill name
      .sort({ timestamp: -1 });
    res.json(applications);
  } catch (err) {
    console.error('❌ Error fetching my applications:', err.message);
    res.status(500).json({ message: 'Error loading your applications' });
  }
});







// Edit HTML page
app.get('/edit/:id', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

// Skills page
app.get('/skills-page', function(req, res) {
  res.sendFile(__dirname + '/public/skills.html');
});

// Start the server
app.listen(3000, () => {
  console.log('🚀 Server started on http://localhost:3000');
});