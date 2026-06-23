import { Schema, model, models, type InferSchemaType } from "mongoose";

const PatientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    gender: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    birthDate: { type: String, default: "" },
    bloodType: { type: String, default: "" },
    allergies: { type: String, default: "" },
    currentMedications: { type: String, default: "" },
    chronicDiseases: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
    emergencyPhone: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Patient = InferSchemaType<typeof PatientSchema>;

export default models.Patient || model("Patient", PatientSchema);
