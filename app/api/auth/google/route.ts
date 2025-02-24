import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { encode } from "next-auth/jwt";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be defined');
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing Google ID token" },
        { status: 400 }
      );
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = new User({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        password: `GOOGLE_${Date.now()}`,
        role: "annotator",
        lastLogin: new Date()
      });
      await user.save();
    }

    // Create NextAuth compatible token
    const sessionToken = await encode({
      token: {
        name: user.name,
        email: user.email,
        picture: payload.picture,
        id: user._id.toString(),
        role: user.role,
        sub: user._id.toString(), // Required for NextAuth
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      },
      secret: process.env.NEXTAUTH_SECRET as string
    });

    // Create the response with the session token cookie
    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 200 }
    );

    // Set the session token cookie
    response.cookies.set({
      name: 'next-auth.session-token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    });

    return response;

  } catch (error: any) {
    console.error("Google auth error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: error.message
      },
      { status: 500 }
    );
  }
}