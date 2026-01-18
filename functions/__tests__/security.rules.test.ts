/**
 * Firebase Security Rules Tests
 * Tests RTDB security rules for authorization
 */

import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
    initializeTestEnvironment,
    RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'snuggle-test',
        database: {
            host: 'localhost',
            port: 9000,
            rules: readFileSync('database.rules.json', 'utf8'),
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

afterEach(async () => {
    await testEnv.clearDatabase();
});

describe('Authentication Security', () => {
    test('unauthenticated users cannot read any data', async () => {
        const unauthedDb = testEnv.unauthenticatedContext().database();

        await assertFails(unauthedDb.ref('users/user1').get());
        await assertFails(unauthedDb.ref('chats/chat1').get());
        await assertFails(unauthedDb.ref('messages/chat1').get());
    });

    test('unauthenticated users cannot write any data', async () => {
        const unauthedDb = testEnv.unauthenticatedContext().database();

        await assertFails(unauthedDb.ref('users/user1').set({ name: 'Test' }));
        await assertFails(unauthedDb.ref('chats/chat1').set({ name: 'Test' }));
    });
});

describe('User Data Access Control', () => {
    test('users can read their own profile', async () => {
        const alice = testEnv.authenticatedContext('alice').database();

        await alice.ref('users/alice').set({
            username: 'Alice',
            email: 'alice@example.com',
        });

        await assertSucceeds(alice.ref('users/alice').get());
    });

    test('users cannot read other users private data', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const bob = testEnv.authenticatedContext('bob').database();

        await alice.ref('users/alice').set({
            username: 'Alice',
            privateData: 'secret',
        });

        // Bob should not be able to read Alice's private data
        await assertFails(bob.ref('users/alice/privateData').get());
    });

    test('users can only write to their own profile', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const bob = testEnv.authenticatedContext('bob').database();

        // Alice can write her own profile
        await assertSucceeds(
            alice.ref('users/alice').set({ username: 'Alice' })
        );

        // Bob cannot write Alice's profile
        await assertFails(
            bob.ref('users/alice').set({ username: 'Hacked' })
        );
    });
});

describe('Chat Access Control', () => {
    test('users can only access chats they are participants in', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const bob = testEnv.authenticatedContext('bob').database();
        const charlie = testEnv.authenticatedContext('charlie').database();

        // Set up chat between Alice and Bob
        await alice.ref('chats/chat1').set({
            participants: { alice: true, bob: true },
        });

        // Alice can read the chat
        await assertSucceeds(alice.ref('chats/chat1').get());

        // Bob can read the chat
        await assertSucceeds(bob.ref('chats/chat1').get());

        // Charlie cannot read the chat
        await assertFails(charlie.ref('chats/chat1').get());
    });

    test('users cannot modify chat participants without permission', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const bob = testEnv.authenticatedContext('bob').database();

        await alice.ref('chats/chat1').set({
            participants: { alice: true, bob: true },
        });

        // Bob tries to add Charlie
        await assertFails(
            bob.ref('chats/chat1/participants/charlie').set(true)
        );
    });
});

describe('Message Access Control', () => {
    test('users can only write messages to chats they participate in', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const charlie = testEnv.authenticatedContext('charlie').database();

        await alice.ref('chats/chat1').set({
            participants: { alice: true, bob: true },
        });

        // Alice can send message
        await assertSucceeds(
            alice.ref('messages/chat1/msg1').set({
                senderId: 'alice',
                text: 'Hello',
                timestamp: Date.now(),
            })
        );

        // Charlie cannot send message to chat they're not in
        await assertFails(
            charlie.ref('messages/chat1/msg2').set({
                senderId: 'charlie',
                text: 'Unauthorized',
                timestamp: Date.now(),
            })
        );
    });

    test('users cannot impersonate others in messages', async () => {
        const alice = testEnv.authenticatedContext('alice').database();

        await alice.ref('chats/chat1').set({
            participants: { alice: true, bob: true },
        });

        // Alice tries to send message as Bob
        await assertFails(
            alice.ref('messages/chat1/msg1').set({
                senderId: 'bob', // Impersonation attempt
                text: 'I am Bob',
                timestamp: Date.now(),
            })
        );
    });
});

describe('Presence & Typing Security', () => {
    test('users can only update their own presence', async () => {
        const alice = testEnv.authenticatedContext('alice').database();
        const bob = testEnv.authenticatedContext('bob').database();

        // Alice can update her presence
        await assertSucceeds(
            alice.ref('presence/alice').set({ online: true })
        );

        // Bob cannot update Alice's presence
        await assertFails(
            bob.ref('presence/alice').set({ online: false })
        );
    });

    test('users can only set typing status as themselves', async () => {
        const alice = testEnv.authenticatedContext('alice').database();

        // Alice can set her own typing status
        await assertSucceeds(
            alice.ref('typing/chat1/alice').set({ typing: true })
        );

        // Alice cannot set Bob's typing status
        await assertFails(
            alice.ref('typing/chat1/bob').set({ typing: true })
        );
    });
});
