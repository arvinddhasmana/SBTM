import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('feed_info')
export class FeedInfo {
  @PrimaryColumn({ name: 'feed_publisher_name', type: 'text' })
  feedPublisherName: string;

  @Column({ name: 'feed_publisher_url', type: 'text' })
  feedPublisherUrl: string;

  @Column({ name: 'feed_lang', type: 'text', default: 'en' })
  feedLang: string;

  @Column({ name: 'feed_start_date', type: 'date', nullable: true })
  feedStartDate: string | null;

  @Column({ name: 'feed_end_date', type: 'date', nullable: true })
  feedEndDate: string | null;

  @Column({ name: 'feed_version', type: 'text', nullable: true })
  feedVersion: string | null;

  @Column({ name: 'feed_contact_email', type: 'text', nullable: true })
  feedContactEmail: string | null;
}
