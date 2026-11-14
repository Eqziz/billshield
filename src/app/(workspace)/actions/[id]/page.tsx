import { Action } from "@/components/action";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Action id={(await params).id} />;
}
