import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-[420px] w-full max-w-[400px]" />}>
      <SignIn />
    </Suspense>
  );
}
