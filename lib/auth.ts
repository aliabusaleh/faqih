import {
  auth as clerkAuth,
  clerkClient,
  currentUser as clerkCurrentUser,
} from "@clerk/nextjs/server";

import { features } from "@/config";

type AppUser = {
  id: string;
  firstName: string | null;
  /** The name to show others: full name, else first name, else username. */
  name: string;
  imageUrl: string;
  email: string | undefined;
};

export const LOCAL_USER: AppUser = {
  id: "local_dev_user",
  firstName: "Dev User",
  name: "Dev User",
  imageUrl: "/mascot.svg",
  email: "dev@localhost",
};

const DEFAULT_NAME = "User";

// Never the email: names are shown publicly on the leaderboard.
const displayName = (user: {
  fullName: string | null;
  firstName: string | null;
  username: string | null;
}) =>
  user.fullName?.trim() ||
  user.firstName?.trim() ||
  user.username?.trim() ||
  DEFAULT_NAME;

// Use these instead of Clerk's auth()/currentUser() so local dev login works.
export const getAuth = async (): Promise<{ userId: string | null }> => {
  if (features.localAuth) return { userId: LOCAL_USER.id };

  const { userId } = await clerkAuth();
  return { userId };
};

export const getCurrentUser = async (): Promise<AppUser | null> => {
  if (features.localAuth) return LOCAL_USER;

  const user = await clerkCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    name: displayName(user),
    imageUrl: user.imageUrl,
    email: user.emailAddresses[0]?.emailAddress,
  };
};

/**
 * Current public name and picture of each user, by id, in one request. The
 * names saved in user_progress are only set when a course is chosen, so they
 * go stale when someone edits their profile. Missing ids (or a failed
 * request) are left out: callers fall back to the saved values.
 */
export const getPublicProfiles = async (
  userIds: string[]
): Promise<Map<string, { name: string; imageUrl: string }>> => {
  if (features.localAuth)
    return new Map(
      userIds
        .filter((id) => id === LOCAL_USER.id)
        .map((id) => [
          id,
          { name: LOCAL_USER.name, imageUrl: LOCAL_USER.imageUrl },
        ])
    );
  if (userIds.length === 0) return new Map();

  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });
    return new Map(
      data.map((user) => [
        user.id,
        { name: displayName(user), imageUrl: user.imageUrl },
      ])
    );
  } catch {
    return new Map();
  }
};
