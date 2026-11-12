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

    // 只有成功更新一条邀请，才继续插入成员。
    if (result.affected !== 1) {
      throw Error('邀请无法接受');
    }

    await manager.insert('project_members', {
      projectId,
      memberId: currentUserId,
    });
  });
}

module.exports = { acceptInvitation };
