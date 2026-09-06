import { WriteForm } from "@/src/WriteForm";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function WriteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const templateId = Array.isArray(id) ? id[0] : id;
  return <WriteForm templateId={templateId ?? ""} onBack={() => router.back()} />;
}
