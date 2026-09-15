/** The signed-in nickname for this session. Fixed for the app's lifetime — no observability needed. */
export class UserStore {
  constructor(public readonly userId: string) {}
}
