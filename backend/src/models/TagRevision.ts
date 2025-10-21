/**
 * TagRevision model for tracking tag edit history
 */

export interface TagRevision {
  id: string;
  tag_id: string;
  revision_number: number;
  name: string;
  description?: string;
  metadata: object;
  created_at: string;
  created_by: string;
}

export class TagRevisionModel {
  static parseMetadata(metadataJson: string): object {
    try {
      return JSON.parse(metadataJson);
    } catch {
      return {};
    }
  }

  static serializeMetadata(metadata: object): string {
    return JSON.stringify(metadata || {});
  }

  static fromRow(row: any): TagRevision {
    return {
      id: row.id,
      tag_id: row.tag_id || row.tagId,
      revision_number: row.revision_number || row.revisionNumber,
      name: row.name,
      description: row.description,
      metadata: TagRevisionModel.parseMetadata(row.metadata),
      created_at: row.created_at || row.createdAt,
      created_by: row.created_by || row.createdBy,
    };
  }
}
