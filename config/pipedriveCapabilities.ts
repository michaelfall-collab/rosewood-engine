export const PIPEDRIVE_CAPABILITIES_REGISTRY = {
  meta: {
    version: "2026.2",
    engine: "Pipedrive Visual Workflow Automation Canvas Engine",
    planRequirement: "Advanced, Professional, Power, or Enterprise Plans (Lite/Growth have strict limits)",
    governanceLimits: {
      maxDelayDays: 90,
      maxMonitoredFieldsPerUpdateTrigger: 10,
      historicalLogRetentionDays: 15,
      delayedExecutionLogExtensionDays: "Total Delay Days + 17 Days"
    }
  },

  /**
   * SECTION 1: EVERY EVENT & DATE TRIGGER + ALL SUB-OPTIONS
   */
  triggers: {
    eventBased: [
      {
        scope: "deal",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "title", "status", "stage_id", "pipeline_id", "value", "currency", 
          "user_id", "owner_id", "creator_id", "org_id", "person_id", "lost_reason", 
          "visible_to", "probability", "expected_close_date", "add_time", "update_time",
          "stage_change_time", "won_time", "lost_time", "close_time", "custom_fields"
        ]
      },
      {
        scope: "lead",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "title", "owner_id", "creator_id", "value", "currency", "is_archived", 
          "was_seen", "organization_id", "person_id", "label_ids", "add_time", "update_time", "custom_fields"
        ]
      },
      {
        scope: "activity",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "subject", "done", "type", "due_date", "due_time", "duration", "user_id", 
          "deal_id", "person_id", "org_id", "lead_id", "project_id", "location", "note", "add_time", "update_time"
        ]
      },
      {
        scope: "person",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "name", "owner_id", "creator_id", "org_id", "email", "phone", "label_ids", 
          "visible_to", "add_time", "update_time", "custom_fields"
        ]
      },
      {
        scope: "organization",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "name", "owner_id", "creator_id", "address", "label_ids", "visible_to", 
          "add_time", "update_time", "custom_fields"
        ]
      },
      {
        scope: "project",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "title", "status", "phase_id", "board_id", "owner_id", "start_date", "end_date", 
          "description", "label_ids", "deal_ids", "add_time", "update_time", "custom_fields"
        ]
      },
      {
        scope: "task",
        events: ["added", "updated", "deleted"],
        subOptionsMonitoredFields: [
          "id", "project_id", "name", "status", "due_date", "creator_id", "assignee_id", "add_time", "update_time"
        ]
      }
    ],

    dateBased: [
      {
        scope: "deal",
        supportedDateFields: ["add_time", "update_time", "stage_change_time", "won_time", "lost_time", "close_time", "expected_close_date", "all_custom_date_fields"],
        operators: ["exact_date", "before_date", "after_date"],
        timeOffsets: { allowHours: true, allowDays: true }
      },
      {
        scope: "activity",
        supportedDateFields: ["due_date", "add_time", "update_time"],
        operators: ["exact_date", "before_date", "after_date"],
        timeOffsets: { allowHours: true, allowDays: true }
      },
      {
        scope: "person",
        supportedDateFields: ["add_time", "update_time", "all_custom_date_fields"],
        operators: ["exact_date", "before_date", "after_date"],
        timeOffsets: { allowHours: true, allowDays: true }
      },
      {
        scope: "organization",
        supportedDateFields: ["add_time", "update_time", "all_custom_date_fields"],
        operators: ["exact_date", "before_date", "after_date"],
        timeOffsets: { allowHours: true, allowDays: true }
      }
    ]
  },

  /**
   * SECTION 2: EXHAUSTIVE CONDITION LOGIC & OPERATORS (Active vs Passive Types)
   */
  conditionOperators: {
    active: [
      { id: "has_changed_to", label: "Has changed to", description: "Fires workflow when a field switches directly to a designated target value." },
      { id: "has_changed", label: "Has changed", description: "Fires workflow upon any system modification to this field, regardless of output value." },
      { id: "filter_matches", label: "Filter matches", description: "Evaluates whether the mutating item enters the target parameters of a pre-saved global Pipedrive Filter." }
    ],
    passive: [
      { id: "is", label: "Is" },
      { id: "is_not", label: "Is not" },
      { id: "contains", label: "Contains" },
      { id: "does_not_contain", label: "Does not contain" },
      { id: "is_empty", label: "Is empty" },
      { id: "is_not_empty", label: "Is not empty" },
      { id: "assigned_to_user_is", label: "Owner / Assigned to user is" },
      { id: "creator_is", label: "Creator is" }
    ]
  },

  /**
   * SECTION 3: STEP/CONTROL STRUCTURAL OPERATIONS
   */
  controlFlow: [
    { id: "instant_condition", type: "EvaluationGate", behavior: "Synchronous inline validation layer evaluating directly below a trigger block." },
    { id: "if_else_condition", type: "BranchingNode", behavior: "Asymmetric split dividing downstream processes into explicit 'Condition met' and 'Condition not met' execution paths." },
    { id: "wait_for_condition", type: "PolledStateListener", behavior: "Holds active workflow token in state cache until the object properties dynamically update to fit conditions." },
    { id: "delay", type: "AsynchronousTimer", behavior: "Holds token progression for a fixed window up to 90 days, parameterized by hours or calendar days." }
  ],

  /**
   * SECTION 4: FULL RE-ENGINEERED NATIVE INTERNAL ACTIONS
   */
  nativeInternalActions: {
    deal: [
      { action: "create", parameters: ["title", "pipeline_id", "stage_id", "value", "currency", "owner_id", "org_id", "person_id", "expected_close_date", "visible_to"] },
      { action: "update_fields", description: "Overwrites static parameters, custom values, formulas, or system identifiers." },
      { action: "move_stage", description: "Transitions deal context location across matching or separate pipelines." },
      { action: "change_status", allowedOutputs: ["Open", "Won", "Lost"] },
      { action: "change_owner", description: "Reassigns global account executive seats." },
      { action: "delete", description: "Soft-deletes or hard-purges a record out of pipeline dashboards." },
      { action: "add_product_to_deal", description: "Attaches a defined catalog product line item with quantities, unit prices, and discounts directly onto a deal context." },
      { action: "add_follower", description: "Enrolls specific team user IDs to receive real-time notifications on deal modifications." },
      { action: "add_label", description: "Appends unique color-coded identifiers." },
      { action: "remove_label", description: "Strips unique color-coded identifiers." }
    ],
    lead: [
      { action: "create", parameters: ["title", "owner_id", "person_id", "org_id", "value", "currency", "label_ids"] },
      { action: "update_fields", description: "Alters inbox values, tags, or tracking details." },
      { action: "convert_to_deal", description: "Pops lead safely out of Inbox node, initializing it as a functional system Deal." },
      { action: "archive", description: "Hides active lead cards from open operational inbox lists." },
      { action: "unarchive", description: "Restores archived records back into primary operational views." },
      { action: "delete", description: "Purges structural metadata from lead tables." }
    ],
    activity: [
      { action: "create", parameters: ["subject", "type", "due_date", "due_time", "duration", "user_id", "deal_id", "person_id", "org_id", "lead_id", "project_id"] },
      { action: "update_fields", description: "Modifies parameters such as date changes or alternate location endpoints." },
      { action: "mark_done", description: "Closes open task loop, saving logging parameters into the timeline records." },
      { action: "delete", description: "Cancels and completely sweeps out expected future events." }
    ],
    person: [
      { action: "create", parameters: ["name", "org_id", "email", "phone", "owner_id", "visible_to"] },
      { action: "update_fields", description: "Modifies standard communications values or data attributes." },
      { action: "change_owner", description: "Transfers relationship ownership assignment metrics." },
      { action: "add_label", description: "Appends specific system labels." },
      { action: "remove_label", description: "Strips historical segmentation labels." },
      { action: "add_follower", description: "Appends a listening user context to the person record." },
      { action: "delete", description: "Removes specific individual records." }
    ],
    organization: [
      { action: "create", parameters: ["name", "owner_id", "address", "visible_to"] },
      { action: "update_fields", description: "Modifies corporate profile fields." },
      { action: "change_owner", description: "Transfers structural account assignment maps." },
      { action: "add_follower", description: "Appends internal listening monitors onto the target corporate entity profile." },
      { action: "delete", description: "Removes target corporate profile card." }
    ],
    note: [
      { action: "create", parameters: ["content", "pinned_to_deal", "pinned_to_lead", "pinned_to_person", "pinned_to_organization", "pinned_to_project"] }
    ],
    communicationEngine: [
      { action: "send_email", description: "Dispatches direct emails mapped using fields from the object context via linked user mailboxes." },
      { action: "send_email_using_template", description: "Merges layout templates with dynamic variables before firing outbound messages." },
      { 
        action: "add_to_sequence", 
        description: "Enrolls target person directly into automated Pulse Sequences. Leverages 2026 'Automated and Delegated Sending' parameters—sending emails dynamically using the matching assignee/triggering user mailbox to eliminate automation redundancy for large teams." 
      },
      { action: "remove_from_sequence", description: "Forcibly ejects target from active outbound sequence logic queues." }
    ],
    projectsAndTasks: [
      { action: "create_board", description: "Generates new tracking layouts for managing operational delivery work." },
      { action: "create_project", description: "Spawns complex tracking files linked directly back to sourcing contracts or deals." },
      { action: "add_task", description: "Appends single task cards onto active phase layouts." },
      { action: "add_milestone", description: "Fixes key project deadlines into structural tracking records." },
      { action: "update_phase", description: "Advances workflows across Kanban boards from delivery kickoff to final closure." }
    ]
  },

  /**
   * SECTION 5: CANVAS NATIVE INTEGRATIONS MATRIX
   */
  supportedIntegrations: {
    "Slack": {
      id: "integration.slack",
      actions: [
        { id: "slack.send_channel_message", subOptions: ["public_channel_selector", "private_channel_selector", "pretext_merge_builder", "attachment_block_constructor"] },
        { id: "slack.send_direct_message", subOptions: ["user_recipient_selector", "pretext_merge_builder", "attachment_block_constructor"] }
      ]
    },
    "Microsoft Teams": {
      id: "integration.ms_teams",
      actions: [
        { id: "ms_teams.send_channel_notification", subOptions: ["team_selector", "channel_id_selector", "adaptive_card_body_text"] },
        { id: "ms_teams.send_direct_message", subOptions: ["user_recipient_selector", "message_payload_text"] }
      ]
    },
    "Asana": {
      id: "integration.asana",
      actions: [
        { id: "asana.create_task", subOptions: ["workspace_id", "project_id", "section_id", "task_name", "due_date_mapping", "assignee_id"] },
        { id: "asana.create_project", subOptions: ["workspace_id", "team_id", "project_name", "layout_mode"] }
      ]
    },
    "Trello": {
      id: "integration.trello",
      actions: [
        { id: "trello.create_card", subOptions: ["board_id", "list_id", "card_name", "card_description", "position_index"] },
        { id: "trello.create_board", subOptions: ["organization_id", "board_name", "permission_level_visibility"] },
        { id: "trello.create_list", subOptions: ["board_id", "list_name"] }
      ]
    },
    "Webhooks": {
      id: "integration.webhooks",
      actions: [
        { 
          id: "webhook.execute_request", 
          subOptions: ["endpoint_url", "http_method_post_or_put", "json_payload_token_merge_map"],
          behavior: "Triggers outbound payload data directly to server links without using outside software connectors." 
        }
      ]
    },
    "Campaigns by Pipedrive": {
      id: "integration.campaigns",
      actions: [
        { id: "campaigns.add_person_to_list", subOptions: ["marketing_list_id", "contact_person_id"] },
        { id: "campaigns.remove_person_from_list", subOptions: ["marketing_list_id", "contact_person_id"] },
        { id: "campaigns.update_subscription_status", subOptions: ["status_value_subscribed_unsubscribed_bounced"] }
      ]
    }
  }
} as const;

export type PipedriveCapabilitiesRegistry = typeof PIPEDRIVE_CAPABILITIES_REGISTRY;