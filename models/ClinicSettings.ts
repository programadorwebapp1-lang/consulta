import { Schema, model, models, type InferSchemaType } from "mongoose";

const ClinicSettingsSchema = new Schema(
  {
    clinicName: { type: String, default: "MediClinic" },
    logoUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    address: { type: String, default: "" },
    googleMapsUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    email: { type: String, default: "" },
    openingHours: { type: String, default: "" },
    galleryImages: { type: [String], default: [] },
    showPricesPublicly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ClinicSettings = InferSchemaType<typeof ClinicSettingsSchema>;

export default models.ClinicSettings || model("ClinicSettings", ClinicSettingsSchema);
