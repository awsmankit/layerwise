import { roles, roleGroups } from '../../data/interview/types';

/** The role choices for a <select>, grouped so sixteen roles stay easy to scan. */
export default function RoleOptions() {
  return (
    <>
      <option value="any">Any role</option>
      {roleGroups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.roles.map((k) => (
            <option key={k} value={k}>
              {roles[k]}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
