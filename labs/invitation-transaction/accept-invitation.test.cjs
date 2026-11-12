const assert = require('node:assert/strict');
const { test } = require('node:test');
const { acceptInvitation } = require('./accept-invitation.cjs');

const input = { invitationId: 5, projectId: 10, currentUserId: 2 };

function setup(affected, insertError) {
  const calls = [];
  const manager = {
    async update(table, conditions, values) {
      calls.push({ operation: 'update', table, conditions, values });
      return { affected };
    },
    async insert(table, values) {
      calls.push({ operation: 'insert', table, values });
      if (insertError) throw insertError;
    },
  };
  const dataSource = {
    // 这里只模拟回调入口，不模拟事务提交、回滚或并发。
    async transaction(work) {
      return work(manager);
    },
  };
  return { dataSource, calls };
}

test('成功更新一行后，使用同一个 manager 插入成员', async () => {
  const { dataSource, calls } = setup(1);
  await acceptInvitation(dataSource, input);
  assert.deepEqual(calls, [
    {
      operation: 'update',
      table: 'invitations',
      conditions: { id: 5, inviteeId: 2, status: 'pending' },
      values: { status: 'accepted' },
    },
    {
      operation: 'insert',
      table: 'project_members',
      values: { projectId: 10, memberId: 2 },
    },
  ]);
});

for (const affected of [0, undefined]) {
  test(`影响行数为 ${affected} 时抛错，不插入成员`, async () => {
    const { dataSource, calls } = setup(affected);
    await assert.rejects(acceptInvitation(dataSource, input), {
      message: '邀请无法接受',
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].operation, 'update');
  });
}

test('成员写入失败，错误继续向事务回调外传播', async () => {
  const failure = new Error('模拟成员写入失败');
  const { dataSource } = setup(1, failure);
  await assert.rejects(acceptInvitation(dataSource, input), (error) => {
    assert.equal(error, failure);
    return true;
  });
});
