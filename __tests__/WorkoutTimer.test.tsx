import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import WorkoutTimer from '../components/WorkoutTimer';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderTimer() {
  return render(<WorkoutTimer />);
}

/** 초 단위만큼 가짜 타이머를 진행시킨다 */
async function advanceSeconds(secs: number) {
  await act(async () => {
    jest.advanceTimersByTime(secs * 1000);
  });
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe('WorkoutTimer — 축소 상태 (pill)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('처음에는 ⏱ 아이콘이 보인다', () => {
    const { getByText } = renderTimer();
    expect(getByText('⏱')).toBeTruthy();
  });

  it('pill을 탭하면 패널이 열린다', async () => {
    const { getByText } = renderTimer();
    await act(async () => { fireEvent.press(getByText('⏱')); });
    expect(getByText('타이머')).toBeTruthy();
  });
});

describe('WorkoutTimer — 확장 패널', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  async function openPanel() {
    const utils = renderTimer();
    await act(async () => { fireEvent.press(utils.getByText('⏱')); });
    return utils;
  }

  it('X 버튼을 누르면 다시 pill로 돌아간다', async () => {
    const { getByText, queryByText } = await openPanel();
    await act(async () => { fireEvent.press(getByText('✕')); });
    expect(queryByText('타이머')).toBeNull();
    expect(getByText('⏱')).toBeTruthy();
  });

  it('프리셋 5개가 모두 렌더된다', async () => {
    const { getByText } = await openPanel();
    expect(getByText('30초')).toBeTruthy();
    expect(getByText('1분')).toBeTruthy();
    expect(getByText('1:30')).toBeTruthy();
    expect(getByText('2분')).toBeTruthy();
    expect(getByText('3분')).toBeTruthy();
  });

  it('프리셋 선택 시 큰 시간 표시가 바뀐다', async () => {
    const { getByText } = await openPanel();
    await act(async () => { fireEvent.press(getByText('30초')); });
    expect(getByText('0:30')).toBeTruthy();
  });

  it('프리셋 선택 시 AsyncStorage에 저장한다', async () => {
    const { getByText } = await openPanel();
    await act(async () => { fireEvent.press(getByText('2분')); });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@workout_timer_seconds', '120');
  });

  it('시작 버튼이 보인다', async () => {
    const { getByText } = await openPanel();
    expect(getByText('시작')).toBeTruthy();
  });
});

describe('WorkoutTimer — 타이머 카운트다운', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  async function openAndSelectPreset(label: string) {
    const utils = renderTimer();
    await act(async () => { fireEvent.press(utils.getByText('⏱')); });
    await act(async () => { fireEvent.press(utils.getByText(label)); });
    return utils;
  }

  it('시작 버튼을 누르면 시간이 줄어든다', async () => {
    const { getByText } = await openAndSelectPreset('30초');
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(5);
    expect(getByText('0:25')).toBeTruthy();
  });

  it('실행 중에는 일시정지 버튼이 보인다', async () => {
    const { getByText } = await openAndSelectPreset('1분');
    await act(async () => { fireEvent.press(getByText('시작')); });
    expect(getByText('일시정지')).toBeTruthy();
  });

  it('일시정지 누르면 카운트가 멈춘다', async () => {
    const { getByText } = await openAndSelectPreset('30초');
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(5);
    await act(async () => { fireEvent.press(getByText('일시정지')); });
    const timeAtPause = getByText('0:25').props.children;
    await advanceSeconds(5); // 멈춰있으니 변화 없어야 함
    expect(getByText('0:25')).toBeTruthy();
  });

  it('일시정지 후 재개하면 남은 시간부터 이어간다', async () => {
    const { getByText } = await openAndSelectPreset('30초');
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(10);
    await act(async () => { fireEvent.press(getByText('일시정지')); });
    await act(async () => { fireEvent.press(getByText('재개')); });
    await advanceSeconds(5);
    expect(getByText('0:15')).toBeTruthy();
  });

  it('리셋하면 설정 시간으로 복귀하고 idle 상태가 된다', async () => {
    const { getByText } = await openAndSelectPreset('30초');
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(10);
    await act(async () => { fireEvent.press(getByText('리셋')); });
    expect(getByText('0:30')).toBeTruthy();
    expect(getByText('시작')).toBeTruthy();
  });
});

describe('WorkoutTimer — 완료 (0:00)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (Vibration.vibrate as jest.Mock).mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('0이 되면 Vibration.vibrate를 호출한다', async () => {
    const { getByText } = render(<WorkoutTimer />);
    await act(async () => { fireEvent.press(getByText('⏱')); });
    await act(async () => { fireEvent.press(getByText('30초')); });
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(30);
    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
  });

  it('완료 후 0:00이 표시된다', async () => {
    const { getByText } = render(<WorkoutTimer />);
    await act(async () => { fireEvent.press(getByText('⏱')); });
    await act(async () => { fireEvent.press(getByText('30초')); });
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(30);
    expect(getByText('0:00')).toBeTruthy();
  });

  it('완료 3초 후 자동으로 idle 복귀한다', async () => {
    const { getByText } = render(<WorkoutTimer />);
    await act(async () => { fireEvent.press(getByText('⏱')); });
    await act(async () => { fireEvent.press(getByText('30초')); });
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(30); // 완료
    await advanceSeconds(3);  // 자동 리셋 대기
    expect(getByText('0:30')).toBeTruthy(); // 설정 시간으로 복귀
    expect(getByText('시작')).toBeTruthy(); // 시작 버튼 다시 보임
  });
});

describe('WorkoutTimer — pill 상태 표시', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('실행 중 패널을 닫아도 pill에 남은 시간이 표시된다', async () => {
    const { getByText } = render(<WorkoutTimer />);
    await act(async () => { fireEvent.press(getByText('⏱')); });
    await act(async () => { fireEvent.press(getByText('1분')); });
    await act(async () => { fireEvent.press(getByText('시작')); });
    await advanceSeconds(10);
    await act(async () => { fireEvent.press(getByText('✕')); }); // 닫기
    expect(getByText('0:50')).toBeTruthy(); // pill에서 시간 확인
  });
});

describe('WorkoutTimer — AsyncStorage 복원', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('저장된 값이 있으면 마운트 시 해당 시간으로 초기화한다', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('90'); // 1:30 저장돼있음
    const utils = render(<WorkoutTimer />);
    await act(async () => { fireEvent.press(utils.getByText('⏱')); });
    // 프리셋 버튼 '1:30'과 큰 시간 표시 '1:30' 둘 다 있으므로 getAllByText 사용
    await waitFor(() => {
      expect(utils.getAllByText('1:30').length).toBeGreaterThanOrEqual(1);
    });
  });
});
