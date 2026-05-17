import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('translations')
export class Translation {
  @PrimaryColumn({ name: 'table_name', type: 'text' })
  tableName: string;

  @PrimaryColumn({ name: 'field_name', type: 'text' })
  fieldName: string;

  @PrimaryColumn({ name: 'language', type: 'text' })
  language: string;

  @Column({ type: 'text' })
  translation: string;

  @PrimaryColumn({ name: 'record_id', type: 'text', default: '' })
  recordId: string;

  @PrimaryColumn({ name: 'record_sub_id', type: 'text', default: '' })
  recordSubId: string;

  @PrimaryColumn({ name: 'field_value', type: 'text', default: '' })
  fieldValue: string;
}
