"use client"


import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

import { useActivate } from "@/hooks/use-activate"
import { useSearchParams } from "next/navigation"
import { getApiUrl } from "@/lib/utils"


enum TokenStatus {
    ACCEPTED="accepted",
    INVALID="invalid",
    PENDING="pending"
}

interface TokenInfo {
    name: string;
    email: string;
    status: TokenStatus
}


// First: Check that the token is still valid
// You were invited as: Professor First Last, professor@school.edu
// Set up your password

// Optionally:
//  Change your display name
//  Set up your first course

function ActivateForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token") // string | null


    const { status, name, setName, email, error } = useActivate(token);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            console.error("Passwords do not match")
            return
        }

        setIsLoading(true);
        try {
            const res =  await fetch(`${getApiUrl()}/invites/activate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    name: name,
                    password: password
                })
            })

            if (!res.ok) throw new Error("couldn't add instructor");
            const data = await res.json();

            console.log("signup error:", error)

            if (error == null) {
                router.push("/instructor/create");
            }
        } catch (error) {
            console.error("Activation error:", error);
            setIsLoading(false);
        }
    }
    



    return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
    <div className="w-full max-w-sm">
    <Card >
      <CardHeader>
        <CardTitle>Redeem Instructor Invite</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input 
                id="name"
                type="text" 
                placeholder={name}
                value={name}
                onChange={(e) => {setName(e.target.value)}}
                required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                disabled
                placeholder={email}
                value={email}
                
              />
              <FieldDescription>
                Your email is saved from your invitation
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => {setPassword(e.target.value)}}
                required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => {setConfirmPassword(e.target.value)}}
                required />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="relative"
                >
                  {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Spinner className="size-4" />
                    </span>
                  )}
                  <span className={isLoading ? "invisible" : ""}>Create Account</span>
                </Button>
                <Button variant="outline" type="button">
                  Sign up with Google (coming soon)
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
      </div>
    </div>

    )
}

function LoadingFallback() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm">
                <Card>
                    <CardHeader>
                        <CardTitle>Redeem Instructor Invite</CardTitle>
                        <CardDescription>
                            Enter your information below to create your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function Activate() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ActivateForm />
        </Suspense>
    )
}
