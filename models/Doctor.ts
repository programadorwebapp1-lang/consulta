import { Schema, model, models, type InferSchemaType } from "mongoose";

const DoctorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    crm: { type: String, required: true, trim: true, unique: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: "Specialty", required: true },
    photoUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    status: { type: String, enum: ["ATIVO", "INATIVO"], default: "ATIVO" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Doctor = InferSchemaType<typeof DoctorSchema>;

export default models.Doctor || model("Doctor", DoctorSchema);
