import { Schema, model, models, type InferSchemaType } from "mongoose";

const ScheduleSchema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, unique: true },
    availableDays: { type: [Number], default: [] },
    startTime: { type: String, default: "08:00" },
    endTime: { type: String, default: "18:00" },
    slotDuration: { type: Number, default: 30 },
    lunchStart: { type: String, default: "" },
    lunchEnd: { type: String, default: "" },
    blockedDates: [
      {
        date: { type: String, required: true },
        reason: { type: String, default: "" },
      },
    ],
    vacationDates: [
      {
        date: { type: String, required: true },
        reason: { type: String, default: "" },
      },
    ],
    blockedSlots: [
      {
        date: { type: String, required: true },
        time: { type: String, required: true },
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export type Schedule = InferSchemaType<typeof ScheduleSchema>;

export default models.Schedule || model("Schedule", ScheduleSchema);
