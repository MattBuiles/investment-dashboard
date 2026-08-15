import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
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

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isAuthCallback = pathname.startsWith("/auth/");
  // Cron routes carry no user session — they authenticate themselves with
  // CRON_SECRET. Redirecting them to /login would make the scheduled sync a
  // no-op, so they bypass the session gate here.
  const isCron = pathname.startsWith("/api/cron");
  // La API de feedback hace su propio chequeo de sesión y responde 401 JSON.
  // Redirigir a /login devolvería HTML y fetch() seguiría el redirect con
  // res.ok === true — un falso "feedback enviado" en la UI.
  const isFeedbackApi = pathname.startsWith("/api/feedback");
  const isPublic =
    pathname === "/" || isAuthRoute || isAuthCallback || isCron || isFeedbackApi;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return response;
}
