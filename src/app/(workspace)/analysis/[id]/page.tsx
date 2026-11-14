import { Analysis } from "@/components/analysis";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Analysis id={(await params).id} />;
}
