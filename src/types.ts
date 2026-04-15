import { context } from '@actions/github';

export type Context = typeof context;

export type ReposListReleasesResponseItem = {
  draft: boolean;
  id: number;
  'tag_name': string;
}
