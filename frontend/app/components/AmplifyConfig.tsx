"use client";

import React from "react";
import { Amplify } from "@aws-amplify/core";

if (typeof window !== "undefined") {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
      },
    },
  });
}

export default function AmplifyConfig({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
