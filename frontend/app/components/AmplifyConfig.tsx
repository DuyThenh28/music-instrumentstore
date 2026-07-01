"use client";

import React from "react";
import { Amplify } from "aws-amplify";

console.log("AmplifyConfig: Initializing with Cognito User Pool:", {
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
});

if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || !process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  console.warn(
    "AmplifyConfig: NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID is missing. " +
    "If you just deployed the stack, please restart your Next.js development server to load the new env variables."
  );
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",
    },
  },
});

export default function AmplifyConfig({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
