import Doctor from "@/models/Doctor";

export async function purgeLegacyDoctorPhotoUrls() {
  await Doctor.updateMany(
    { photoUrl: { $regex: "^data:image/" } },
    { $set: { photoUrl: "" } }
  );
}
