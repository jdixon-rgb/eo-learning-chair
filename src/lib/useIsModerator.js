import { useMemo } from 'react'
import { useAuth } from './auth'
import { useBoardStore } from './boardStore'
import { useForumStore } from './forumStore'

// "Is the current user a forum moderator anywhere in the chapter?"
//
// Honors the role-switcher: when a super-admin or president picks
// "Forum Moderator" from the Switch role dropdown, viewAsRole flips to
// 'moderator' and this hook returns true so the Moderator sidebar
// section appears. That's a UI preview only — the previewer still
// lacks the underlying chapter_member row, so writes will fail under
// RLS. That's intentional (preview ≠ act on someone else's behalf).
//
//
// Two signals collapse into a single answer:
//   1. chapter_members.is_forum_moderator — legacy boolean flag set
//      from the admin Members page. Forum-agnostic: just "this person
//      moderates a forum."
//   2. forum_role_assignments.role = 'moderator' — fiscal-year-scoped
//      assignment that ties a member to a specific forum's moderator
//      seat. This is where the rotating moderator pipeline lives.
//
// Either signal grants the moderator hat. Returns the list of forums
// the user moderates so callers can scope their views (e.g. "Forum
// Members & Roles" deep-links into the right forum's tab).
//
// Admins / super-admins are not auto-moderators here — they get into
// moderator views via role-switching, not by virtue of being admin.
// (ForumHomePage already auto-grants edit-affordance to admins; the
// sidebar Moderator section is intentionally narrower so admins don't
// see a "Moderator" pseudo-role they don't actually hold.)
export function useIsModerator() {
  const { profile, viewAsRole } = useAuth()
  const { chapterMembers } = useBoardStore()
  const { forumRoles } = useForumStore()

  // Role-switcher preview short-circuit. When a super-admin / president
  // picks "Forum Moderator" we treat the session as moderator without
  // requiring a real chapter_members row — they're previewing the UI.
  const previewing = viewAsRole === 'moderator'

  const member = useMemo(() => {
    const email = profile?.email?.toLowerCase()
    if (!email) return null
    return chapterMembers.find(m => (m.email || '').toLowerCase() === email) ?? null
  }, [profile, chapterMembers])

  const isFlagged = !!member?.is_forum_moderator

  const moderatedRoleAssignments = useMemo(() => {
    if (!member?.id) return []
    return forumRoles.filter(r => r.chapter_member_id === member.id && r.role === 'moderator')
  }, [forumRoles, member])

  const moderatedForumIds = useMemo(() => {
    const ids = new Set()
    moderatedRoleAssignments.forEach(r => { if (r.forum_id) ids.add(r.forum_id) })
    // The legacy boolean flag doesn't tie to a specific forum_id.
    // If we know the member's forum name, surface that — moderator
    // views still need to know which forum to edit.
    if (isFlagged && member?.forum) ids.add(`name:${member.forum}`)
    return [...ids]
  }, [moderatedRoleAssignments, isFlagged, member])

  const isModerator = previewing || isFlagged || moderatedRoleAssignments.length > 0

  return { isModerator, member, moderatedForumIds, previewing }
}
