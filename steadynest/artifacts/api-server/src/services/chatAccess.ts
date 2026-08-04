import { and, eq, or } from "drizzle-orm";
import { db, groupMembers, swipes } from "@workspace/db";

export type ChatRoomKind = "direct" | "group";
export type RoomAuthorizer = (userId: string, roomId: string) => Promise<ChatRoomKind | null>;

type ChatAccessRepository = {
  isGroupMember: (userId: string, groupId: string) => Promise<boolean>;
  hasMatchedDirectConversation: (userId: string, otherUserId: string) => Promise<boolean>;
};

/**
 * Direct conversations are minted by routes/match.ts from two sorted UUIDs.
 * Anything ambiguous or non-canonical fails closed instead of being treated as
 * a group identifier.
 */
export function parseDirectRoom(roomId: string): [string, string] | null {
  const parts = roomId.split("_");
  if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0] === parts[1]) return null;

  const [first, second] = parts;
  return [first, second].sort().join("_") === roomId ? [first, second] : null;
}

const productionRepository: ChatAccessRepository = {
  async isGroupMember(userId, groupId) {
    const membership = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.group_id, groupId), eq(groupMembers.user_id, userId)))
      .limit(1);

    return membership.length === 1;
  },

  async hasMatchedDirectConversation(userId, otherUserId) {
    const matches = await db
      .select({ swiperId: swipes.swiper_id, targetId: swipes.target_id })
      .from(swipes)
      .where(and(
        eq(swipes.status, "matched"),
        or(
          and(eq(swipes.swiper_id, userId), eq(swipes.target_id, otherUserId)),
          and(eq(swipes.swiper_id, otherUserId), eq(swipes.target_id, userId)),
        ),
      ));

    const directions = new Set(matches.map((match) => `${match.swiperId}:${match.targetId}`));
    return directions.has(`${userId}:${otherUserId}`) && directions.has(`${otherUserId}:${userId}`);
  },
};

/**
 * Resolves a room only when the authenticated user has server-side access.
 * Direct rooms require a reciprocal matched swipe; all other identifiers are
 * groups and require a row in group_members. There is no client-controlled
 * allow-list in this decision.
 */
export function createRoomAuthorizer(
  repository: ChatAccessRepository = productionRepository,
): RoomAuthorizer {
  return async (userId, roomId) => {
    const directParticipants = parseDirectRoom(roomId);
    if (directParticipants) {
      if (!directParticipants.includes(userId)) return null;
      const otherUserId = directParticipants[0] === userId
        ? directParticipants[1]
        : directParticipants[0];
      return await repository.hasMatchedDirectConversation(userId, otherUserId) ? "direct" : null;
    }

    return await repository.isGroupMember(userId, roomId) ? "group" : null;
  };
}

export const authorizeRoomAccess = createRoomAuthorizer();
