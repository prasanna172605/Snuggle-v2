const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

let testEnv;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'snuggle-test',
        database: {
            host: 'localhost',
            port: 9000,
            rules: require('fs').readFileSync('../database.rules.json', 'utf8'),
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

afterEach(async () => {
    await testEnv.clearDatabase();
});

describe('RTDB Security Rules', () => {
    describe('Users', () => {
        test('user can read their own data', async () => {
            const alice = testEnv.authenticatedContext('alice');
            const db = getDatabase(alice);

            await assertSucceeds(alice.database().ref('users/alice').once('value'));
        });

        test('user cannot read other users private data', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await assertFails(alice.database().ref('users/bob/email').once('value'));
        });

        test('user can only write to their own user node', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await assertSucceeds(
                alice.database().ref('users/alice').set({
                    id: 'alice',
                    username: 'alice_user',
                    email: 'alice@test.com',
                })
            );

            await assertFails(
                alice.database().ref('users/bob').set({
                    id: 'bob',
                    username: 'bob_user',
                })
            );
        });

        test('username must match validation pattern', async () => {
            const alice = testEnv.authenticatedContext('alice');

            // Valid username
            await assertSucceeds(
                alice.database().ref('users/alice/username').set('alice_123')
            );

            // Invalid username (special characters)
            await assertFails(
                alice.database().ref('users/alice/username').set('alice@!')
            );

            // Too short
            await assertFails(
                alice.database().ref('users/alice/username').set('ab')
            );
        });
    });

    describe('Messages', () => {
        test('chat participant can read messages', async () => {
            const alice = testEnv.authenticatedContext('alice');

            // Setup chat with Alice as participant
            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.database().ref('chats/chat1').set({
                    participants: { alice: true, bob: true },
                });
            });

            await assertSucceeds(
                alice.database().ref('messages/chat1').once('value')
            );
        });

        test('non-participant cannot read messages', async () => {
            const charlie = testEnv.authenticatedContext('charlie');

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.database().ref('chats/chat1').set({
                    participants: { alice: true, bob: true },
                });
            });

            await assertFails(
                charlie.database().ref('messages/chat1').once('value')
            );
        });

        test('message must have valid structure', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context.database().ref('chats/chat1').set({
                    participants: { alice: true },
                });
            });

            // Valid message
            await assertSucceeds(
                alice.database().ref('messages/chat1/msg1').set({
                    id: 'msg1',
                    senderId: 'alice',
                    text: 'Hello',
                    timestamp: Date.now(),
                })
            );

            // Missing required field
            await assertFails(
                alice.database().ref('messages/chat1/msg2').set({
                    id: 'msg2',
                    senderId: 'alice',
                    // Missing text
                    timestamp: Date.now(),
                })
            );

            // Message too long
            await assertFails(
                alice.database().ref('messages/chat1/msg3').set({
                    id: 'msg3',
                    senderId: 'alice',
                    text: 'a'.repeat(6000),
                    timestamp: Date.now(),
                })
            );
        });
    });

    describe('Presence', () => {
        test('user can update their own presence', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await assertSucceeds(
                alice.database().ref('presence/alice').set({
                    status: 'online',
                    lastSeen: Date.now(),
                })
            );
        });

        test('user cannot update other user presence', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await assertFails(
                alice.database().ref('presence/bob').set({
                    status: 'online',
                    lastSeen: Date.now(),
                })
            );
        });

        test('status must be valid enum value', async () => {
            const alice = testEnv.authenticatedContext('alice');

            await assertSucceeds(
                alice.database().ref('presence/alice/status').set('online')
            );

            await assertFails(
                alice.database().ref('presence/alice/status').set('invalid_status')
            );
        });
    });
});
