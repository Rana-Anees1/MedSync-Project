import Setting from '../models/Setting.js';
import { DEFAULT_RULES } from './defaults.js';

export async function getRules() {
  let s = await Setting.findOne({ key: 'rules' }).lean();
  if (!s) s = (await Setting.create({ key: 'rules', rules: DEFAULT_RULES })).toObject();
  return s.rules;
}
