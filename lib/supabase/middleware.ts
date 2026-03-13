import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/login";
  const isSubmitPage = pathname.startsWith("/submit");
  const isEvaluatePage = pathname.startsWith("/evaluate");

  if (!user && (isSubmitPage || isEvaluatePage)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    const role = user.user_metadata?.role;

    if (isAuthPage) {
      if (role === "developer") {
        return NextResponse.redirect(new URL("/submit", request.url));
      }

      if (role === "evaluator") {
        return NextResponse.redirect(new URL("/evaluate", request.url));
      }
    }

    if (isSubmitPage && role !== "developer") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isEvaluatePage && role !== "evaluator") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}