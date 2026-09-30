const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    // admin: everything. consultant: assigned schools. client: exactly one school (client portal).
    role: { type: String, enum: ['admin', 'consultant', 'client'], default: 'client' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null }, // legacy: single school of older school accounts
    schools: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }], // role=consultant or client: the schools they may access
    active: { type: Boolean, default: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    // older school accounts only have `school`; expose everything as one list
    schools: this.role === 'client' && this.school && !this.schools.some((s) => String(s) === String(this.school)) ? [this.school, ...this.schools] : this.schools,
    active: this.active,
    phone: this.phone,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
