import { Card, LinkButton, Title } from "@/components/ui";

export function NoEvent() {
  return (
    <>
      <Title>No current event</Title>
      <Card className="space-y-3 text-sm text-neutral-700">
        <p>Everything (categories, participants, judges, results) belongs to an event, one per festival edition. Create one first.</p>
        <LinkButton href="/admin/events">Go to Events</LinkButton>
      </Card>
    </>
  );
}
