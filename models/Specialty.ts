import { Schema, model, models, type InferSchemaType } from "mongoose";

const SpecialtySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type Specialty = InferSchemaType<typeof SpecialtySchema>;

export default models.Specialty || model("Specialty", SpecialtySchema);
