import type { InviteUserPayload, InviteResponse, ProvisionedUser } from '../../api/provisioning.api';
import { MOCK_PROVISIONED_USERS } from '../data/provisioning.data';

export const mockProvisioningApi = {
    inviteUser: async (payload: InviteUserPayload): Promise<InviteResponse> => ({
        message: `Invitation sent to ${payload.email}`,
        invitationUrl: `http://localhost:5173/accept-invite?token=mock-${Date.now()}`,
    }),
    listUsers: async (): Promise<ProvisionedUser[]> => MOCK_PROVISIONED_USERS,
    deactivateUser: async (userId: string): Promise<{ message: string }> => ({ message: `User ${userId} deactivated` }),
    reactivateUser: async (userId: string): Promise<{ message: string }> => ({ message: `User ${userId} reactivated` }),
};
