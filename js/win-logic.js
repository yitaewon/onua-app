/**
 * win-logic.js
 * 투표 결과(처형된 플레이어들의 실제 번호/역할)를 받아
 * 팀별 승/패를 계산한다.
 *
 * killedPlayers: [{ number: 3, role: "alien" }, ...]  (0명일 수도 있음)
 */

function computeResults(state, killedPlayers) {
  const killedRoleIds = killedPlayers.map((k) => k.role);
  const killedNumbers = killedPlayers.map((k) => k.number);
  const flags = state.flags;
  const has = (id) => state.selectedRoles.includes(id);

  const results = []; // { team, label, won, reason }

  // ---- 0. Oracle 오답 시 전체 규칙 override ----
  if (has("oracle") && flags.oracleGuessResult === "incorrect") {
    // Oracle 본인의 생존 여부는 "처형된 플레이어의 역할이 oracle인지"로 판단
    const oracleKilled = killedRoleIds.includes("oracle");
    const oracleWins = !oracleKilled;
    results.push({
      team: "oracle",
      label: "Oracle",
      won: oracleWins,
      reason:
        "Oracle이 숫자를 틀려서, 모두의 목표가 'Oracle 제거'로 바뀌었습니다.",
    });
    results.push({
      team: "everyone-else",
      label: "그 외 전원",
      won: oracleKilled,
      reason: oracleKilled
        ? "Oracle이 처형되어 나머지 전원 승리."
        : "Oracle이 생존해 나머지 전원 패배.",
    });
    return results; // 다른 규칙은 전부 무시하고 이 결과만 적용
  }

  // ---- 1. 에일리언 팀(기본 규칙에 쓰일 死亡 여부) ----
  const alienCardDied = killedRoleIds.some((r) =>
    ["alien", "groob", "zerb"].includes(r)
  );
  const minionDied =
    flags.alienMinionPlayer != null &&
    killedNumbers.includes(flags.alienMinionPlayer);
  const alienTeamMemberDied = alienCardDied || minionDied;

  const alienInPlay =
    has("alien") || has("groob") || has("zerb") || has("synthetic");

  // ---- 2. 리더가 "에일리언 전원이 자신을 가리킴"을 본 경우: 마을 무조건 패배 ----
  const leaderForcedAlienWin = has("leader") && flags.leaderAllAliensPointed;

  let villageWins;
  if (leaderForcedAlienWin) {
    villageWins = false;
  } else if (!alienInPlay) {
    villageWins = true; // 에일리언이 아예 없으면 마을 자동 승리
  } else {
    villageWins = alienTeamMemberDied;
  }
  results.push({
    team: "village",
    label: "마을(Village) 팀",
    won: villageWins,
    reason: leaderForcedAlienWin
      ? "에일리언 팀 전원이 리더를 가리켜 무조건 패배."
      : villageWins
      ? "에일리언(또는 미니언)이 처형되었습니다."
      : "에일리언이 처형되지 않았습니다.",
  });
  results.push({
    team: "alien",
    label: "에일리언(Alien) 팀",
    won: !villageWins,
    reason: !villageWins
      ? "에일리언 팀이 살아남았습니다."
      : "에일리언 팀원이 처형되었습니다.",
  });

  // ---- 3. Synthetic Alien: 자신이 죽어야 승리, 죽으면 나머지 전부 패배 ----
  if (has("synthetic")) {
    const syntheticDied = killedRoleIds.includes("synthetic");
    results.push({
      team: "synthetic",
      label: "Synthetic Alien",
      won: syntheticDied,
      reason: syntheticDied
        ? "Synthetic Alien이 처형되어 승리 (다른 모든 팀은 패배)."
        : "Synthetic Alien이 생존해 패배.",
    });
    if (syntheticDied) {
      // 다른 모든 팀 패배로 덮어쓰기
      for (const r of results) {
        if (r.team !== "synthetic") r.won = false;
      }
    }
  }

  // ---- 4. Groob & Zerb 둘 다 있을 때: 상대가 죽고 나는 살아야 승리 ----
  if (has("groob") && has("zerb")) {
    const groobDied = killedRoleIds.includes("groob");
    const zerbDied = killedRoleIds.includes("zerb");
    results.push({
      team: "groob",
      label: "Groob",
      won: zerbDied && !groobDied,
      reason:
        zerbDied && !groobDied
          ? "제르브는 죽고 그루브는 생존."
          : "조건 미충족.",
    });
    results.push({
      team: "zerb",
      label: "Zerb",
      won: groobDied && !zerbDied,
      reason:
        groobDied && !zerbDied
          ? "그루브는 죽고 제르브는 생존."
          : "조건 미충족.",
    });
  }

  // ---- 5. Leader: 그루브+제르브 둘 다 있으면 "둘 다 생존"해야 승리 ----
  if (has("leader")) {
    let leaderWon;
    if (has("groob") && has("zerb")) {
      const groobDied = killedRoleIds.includes("groob");
      const zerbDied = killedRoleIds.includes("zerb");
      leaderWon = !groobDied && !zerbDied;
    } else {
      leaderWon = villageWins;
    }
    if (leaderForcedAlienWin) leaderWon = false;
    results.push({
      team: "leader",
      label: "Leader",
      won: leaderWon,
      reason: "리더 개별 승리 조건 적용.",
    });
  }

  // ---- 6. Blob: 자신이 지정한 그룹이 아무도 안 죽으면 승리 (독립) ----
  if (has("blob") && flags.blobGroupPlayers) {
    const groupSurvived = flags.blobGroupPlayers.every(
      (n) => !killedNumbers.includes(n)
    );
    results.push({
      team: "blob",
      label: "Blob",
      won: groupSurvived,
      reason: groupSurvived
        ? "블롭의 일부가 전원 생존."
        : "블롭의 일부 중 한 명 이상 사망.",
    });
  }

  // ---- 7. Mortician: 지정된 왼쪽/오른쪽 대상이 죽으면 승리 (독립) ----
  if (has("mortician") && flags.morticianWatchPlayers) {
    const targetDied = flags.morticianWatchPlayers.some((n) =>
      killedNumbers.includes(n)
    );
    results.push({
      team: "mortician",
      label: "Mortician",
      won: targetDied,
      reason: targetDied
        ? "지정된 대상 중 한 명 이상 사망."
        : "지정된 대상이 아무도 죽지 않음.",
    });
  }

  return results;
}
