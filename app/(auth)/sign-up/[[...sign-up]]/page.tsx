import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create your café account" };

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-[520px] w-full max-w-[400px]" />}>
      <SignUp />
    </Suspense>
  );
}
