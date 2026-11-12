// 独立控制流练习：dataSource 由测试提供，不连接真实数据库。
// projectId 在此为可信测试数据；真实接口必须从邀请记录读取，不能信任客户端。
async function acceptInvitation(
  dataSource,
  { invitationId, projectId, currentUserId },
) {
  return dataSource.transaction(async (manager) => {
    const result = await manager.update(
      'invitations',
      { id: invitationId, inviteeId: currentUserId, status: 'pending' },
      { status: 'accepted' },
    );

    // TODO：只有 result.affected 恰好为 1 才能继续。
    // 其余情况抛出 Error，消息使用“邀请无法接受”。
    // 请在这里补充判断，保留下面的插入操作。

    await manager.insert('project_members', {
      projectId,
      memberId: currentUserId,
    });
  });
}

module.exports = { acceptInvitation };
