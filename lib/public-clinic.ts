import { connectMongo } from "@/lib/mongodb";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";
import ClinicSettings from "@/models/ClinicSettings";
import Doctor from "@/models/Doctor";
import Specialty from "@/models/Specialty";

export type PublicClinicPrice = {
  specialtyId: string;
  specialtyName: string;
  doctorId?: string;
  doctorName?: string;
  priceLabel: string;
  rawPrice: number | null;
  showPrice: boolean;
  specialtyDescription?: string;
  doctorBio?: string;
};

export type PublicClinicSnapshot = {
  clinicSettings: Record<string, any>;
  specialties: Record<string, any>[];
  doctors: Record<string, any>[];
  prices: PublicClinicPrice[];
};

export function formatCurrencyBRL(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Preço sob consulta";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function resolvePublicPrice({
  showPricePublicly,
  specialtyPrice,
  doctorPrice,
}: {
  showPricePublicly?: boolean;
  specialtyPrice?: number | null;
  doctorPrice?: number | null;
}) {
  if (showPricePublicly === false) {
    return { showPrice: false, priceLabel: "" };
  }

  const resolved = doctorPrice ?? specialtyPrice ?? null;
  return {
    showPrice: true,
    rawPrice: resolved,
    priceLabel: formatCurrencyBRL(resolved),
  };
}

export async function getPublicClinicSnapshot(): Promise<PublicClinicSnapshot> {
  await connectMongo();
  await purgeLegacyDoctorPhotoUrls();

  const [clinicSettingsDoc, specialties, doctors] = await Promise.all([
    ClinicSettings.findOne().lean(),
    Specialty.find({ active: true }).sort({ name: 1 }).lean(),
    Doctor.find({ active: true, status: { $ne: "INATIVO" } }).populate(["specialtyId", "specialtyIds"]).sort({ name: 1 }).lean(),
  ]);

  const clinicSettings = clinicSettingsDoc || {
    clinicName: "MediClinic",
    logoUrl: "",
    bannerUrl: "",
    description: "",
    address: "",
    googleMapsUrl: "",
    phone: "",
    whatsapp: "",
    email: "",
    openingHours: "",
    galleryImages: [],
    showPricesPublicly: true,
  };

  const specialtiesById = new Map(
    specialties.map((specialty) => [String((specialty as Record<string, any>)._id), specialty])
  );

  function getDoctorSpecialties(doctor: Record<string, any>) {
    const specialtyEntries = [
      ...(Array.isArray(doctor.specialtyIds) ? doctor.specialtyIds : []),
      doctor.specialtyId,
    ]
      .map((entry) => specialtiesById.get(String(entry?._id || entry)))
      .filter(Boolean) as Record<string, any>[];

    const unique = new Map<string, Record<string, any>>();
    for (const specialty of specialtyEntries) {
      unique.set(String(specialty._id), specialty);
    }

    return Array.from(unique.values());
  }

  const prices = doctors.flatMap((doctor) => {
    const doctorRecord = doctor as Record<string, any>;
    const doctorSpecialties = getDoctorSpecialties(doctorRecord);

    return doctorSpecialties.map((specialty) => {
      const showPricePublicly = clinicSettings.showPricesPublicly && specialty.showPricePublicly !== false;
      const resolved = resolvePublicPrice({
        showPricePublicly,
        specialtyPrice: specialty.consultationPrice,
        doctorPrice: doctorRecord.consultationPrice,
      });

      return {
        specialtyId: String(specialty._id || ""),
        specialtyName: String(specialty.name || ""),
        doctorId: String(doctorRecord._id || ""),
        doctorName: String(doctorRecord.name || ""),
        priceLabel: resolved.priceLabel || "Preço sob consulta",
        rawPrice: resolved.rawPrice ?? null,
        showPrice: resolved.showPrice,
        specialtyDescription: String(specialty.description || ""),
        doctorBio: String(doctorRecord.bio || ""),
      };
    });
  });

  return {
    clinicSettings,
    specialties,
    doctors,
    prices,
  };
}
