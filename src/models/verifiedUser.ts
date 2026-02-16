import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface describing a verified guild member. A verified user is one who
 * pressed the verification button. Tracking verified users allows the
 * server owner to maintain a record of who has previously joined and been
 * verified, which can be useful if the guild is migrated or if a user
 * leaves and later rejoins. Only the Discord user ID is stored to avoid
 * persisting any sensitive data.
 */
export interface IVerifiedUser extends Document {
  /** Discord user ID of the verified member */
  userId: string;
  /** Timestamp when the user verified themselves */
  verifiedAt: Date;
}

const VerifiedUserSchema = new Schema<IVerifiedUser>({
  userId: { type: String, required: true, unique: true },
  verifiedAt: { type: Date, default: () => new Date() },
});

// Export the model. If it already exists on the mongoose connection
// (e.g., due to hot reload in development), reuse the existing model
export default mongoose.models.VerifiedUser || mongoose.model<IVerifiedUser>('VerifiedUser', VerifiedUserSchema);