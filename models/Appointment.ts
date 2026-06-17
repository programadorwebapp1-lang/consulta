import { Schema, model, models, type InferSchemaType } from "mongoose";

const AppointmentSchema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: "Specialty", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"],
      default: "AGENDADA",
    },
    notes: { type: String, default: "" },
    rescheduledFrom: {
      appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
      date: { type: String, default: null },
      time: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export type Appointment = InferSchemaType<typeof AppointmentSchema>;

export default models.Appointment || model("Appointment", AppointmentSchema);
