export const PIPEDRIVE_CAPABILITIES_REGISTRY = {
  triggers: [
    { id: "deal.created", label: "New Deal Created", scope: "deal" },
    { id: "deal.updated.stage", label: "Deal Stage Changed", scope: "deal" },
    { id: "deal.updated.status", label: "Deal Status Changed (Won/Lost)", scope: "deal" },
    { id: "activity.created", label: "New Activity Scheduled", scope: "activity" },
    { id: "activity.completed", label: "Activity Marked as Done", scope: "activity" },
    { id: "person.created", label: "New Contact Created", scope: "person" },
  ],
  nativeInternalActions: [
    "Create an Activity (Call, Task, Meeting)",
    "Update a Deal Field (System or Custom)",
    "Update a Person Field",
    "Change Deal Stage or Pipeline",
    "Assign to New Owner",
    "Send an Email (via Pipedrive Template)",
  ],
  supportedIntegrations: {
    "Slack": {
      actions: ["Send a message to a public/private channel", "Send a direct message"],
    },
    "Microsoft Teams": {
      actions: ["Send a channel notification", "Send a direct message"],
    },
    "Asana": {
      actions: ["Create a new task", "Create a new project"],
    },
    "Trello": {
      actions: ["Create a new Trello card", "Create a new board", "Create a new list"],
    },
    "Webhooks": {
      actions: ["Send outbound JSON payload to external endpoint URL"],
    },
    "Campaigns by Pipedrive": {
      actions: ["Add person to marketing list", "Update email subscription status"],
    },
    "Projects by Pipedrive": {
      actions: ["Create a new project board", "Add a task/milestone to a project"],
    },
  },
} as const;
