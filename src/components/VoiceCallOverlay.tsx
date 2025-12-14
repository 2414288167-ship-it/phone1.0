import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Minimize2,
} from "lucide-react";

interface VoiceCallOverlayProps {
  isOpen: boolean;
  // 🔥 修改：onClose 现在接收状态和时长，用于生成通话记录
  onClose: (
    status: "completed" | "rejected" | "missed",
    duration: number
  ) => void;
  contactInfo: {
    name: string;
    avatar: string;
  };
  direction: "outgoing" | "incoming";
}

type CallState =
  | "dialing" // 我正在呼叫对方 (显示挂断)
  | "incoming" // 对方正在呼叫我 (显示接听/拒绝)
  | "connected_notice" // 刚接通，显示“已接听”文本
  | "talking"; // 正式通话，显示计时器

export default function VoiceCallOverlay({
  isOpen,
  onClose,
  contactInfo,
  direction,
}: VoiceCallOverlayProps) {
  const [callState, setCallState] = useState<CallState>("dialing");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  // 状态初始化与自动接听逻辑 (包含 AI 决策)
  useEffect(() => {
    if (isOpen) {
      setDuration(0);
      setIsMuted(false);

      if (direction === "outgoing") {
        // 场景1：我打给AI
        setCallState("dialing");

        // 🔥 AI 决定接听的逻辑
        const timer = setTimeout(() => {
          // 模拟概率：90% 接听，10% 拒接
          const willAccept = Math.random() > 0.1;

          if (willAccept) {
            setCallState("connected_notice");
          } else {
            // AI 拒绝了通话 (传递 rejected 和时长 0)
            onClose("rejected", 0);
          }
        }, 3000); // 响铃 3 秒后决定

        return () => clearTimeout(timer);
      } else {
        // 场景2：AI打给我
        setCallState("incoming");
      }
    }
  }, [isOpen, direction]); // 注意：这里不依赖 onClose 防止循环，通常 onClose 由父组件 useCallback 包裹

  // “已接听”状态停留 10秒 逻辑
  useEffect(() => {
    if (callState === "connected_notice") {
      const timer = setTimeout(() => {
        setCallState("talking");
      }, 10000); // 显示10秒“已接听”
      return () => clearTimeout(timer);
    }
  }, [callState]);

  // 计时器逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && callState === "talking") {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, callState]);

  // --- 动作处理函数 ---

  // 处理挂断/取消/拒绝
  const handleHangup = () => {
    if (callState === "talking" || callState === "connected_notice") {
      // 如果已经接通，视为正常结束 (completed)
      onClose("completed", duration);
    } else {
      // 如果还在呼叫或响铃，视为拒接/取消 (rejected)
      // 如果是我打过去还没接通就点挂断，也是 rejected (时长0)
      onClose("rejected", 0);
    }
  };

  // 处理接听 (仅用于 Incoming)
  const handleAccept = () => {
    setCallState("connected_notice");
  };

  // 处理拒绝 (仅用于 Incoming)
  const handleReject = () => {
    onClose("rejected", 0);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center text-white overflow-hidden animate-in fade-in duration-300 font-sans">
      {/* --- 背景层 (高斯模糊 + 暗化) --- */}
      <div className="absolute inset-0 bg-black">
        <img
          src={contactInfo.avatar}
          alt="bg"
          className="w-full h-full object-cover opacity-50 blur-3xl scale-125 brightness-[0.6]"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* --- 内容层 --- */}
      <div className="relative z-10 flex flex-col items-center w-full h-full pt-20 pb-12 px-8 justify-between">
        {/* 顶部最小化按钮 (点击视为挂断/退出) */}
        <div className="w-full flex justify-between items-start opacity-70">
          <button onClick={handleHangup} className="p-2 active:opacity-50">
            <Minimize2 className="w-6 h-6" />
          </button>
        </div>

        {/* --- 中间信息区域 --- */}
        <div className="flex flex-col items-center gap-6 mt-8">
          {/* 头像 */}
          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <img
              src={contactInfo.avatar}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 名称 */}
          <h2 className="text-3xl font-medium tracking-wide text-shadow-sm">
            {contactInfo.name}
          </h2>

          {/* 状态文本 */}
          <p className="text-gray-200 text-base font-light tracking-widest animate-pulse">
            {callState === "dialing" && "正在等待对方接听..."}
            {callState === "incoming" && "邀请你语音通话..."}
            {callState === "connected_notice" && "已接听"}
            {callState === "talking" && (
              <span className="font-mono text-xl animate-none">
                {formatTime(duration)}
              </span>
            )}
          </p>
        </div>

        {/* --- 底部控制区域 --- */}
        <div className="w-full max-w-[320px] mb-8">
          {/* 场景 A: AI打给我 (Incoming) -> 显示 接听/拒绝 */}
          {callState === "incoming" && (
            <div className="flex justify-between items-center px-8">
              {/* 拒绝 */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleReject}
                  className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center shadow-lg hover:brightness-90 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-8 h-8 fill-white text-white" />
                </button>
                <span className="text-sm text-gray-300 font-light mt-1">
                  拒绝
                </span>
              </div>

              {/* 接听 */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="w-[72px] h-[72px] rounded-full bg-[#30D158] flex items-center justify-center shadow-lg hover:brightness-90 active:scale-95 transition-all"
                >
                  <Phone className="w-8 h-8 fill-white text-white" />
                </button>
                <span className="text-sm text-gray-300 font-light mt-1">
                  接听
                </span>
              </div>
            </div>
          )}

          {/* 场景 B: 正在呼叫 (Dialing) -> 只显示 取消 (居中) */}
          {callState === "dialing" && (
            <div className="flex justify-center items-center">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={handleHangup}
                  className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center shadow-lg hover:brightness-90 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-8 h-8 fill-white text-white" />
                </button>
                <span className="text-sm text-gray-300 font-light mt-1">
                  取消
                </span>
              </div>
            </div>
          )}

          {/* 场景 C: 通话中/已接听 -> 显示 静音/挂断/免提 */}
          {(callState === "connected_notice" || callState === "talking") && (
            <div className="grid grid-cols-3 gap-6 items-center">
              {/* 静音 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border border-white/10 ${
                    isMuted
                      ? "bg-white text-black"
                      : "bg-white/10 text-white backdrop-blur-md"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-7 h-7" />
                  ) : (
                    <Mic className="w-7 h-7" />
                  )}
                </button>
                <span className="text-xs text-gray-300 font-light">麦克风</span>
              </div>

              {/* 挂断 (红色) */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={handleHangup}
                  className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center shadow-lg hover:brightness-90 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-8 h-8 fill-white text-white" />
                </button>
                <span className="text-xs text-gray-300 font-light">挂断</span>
              </div>

              {/* 免提 */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border border-white/10 ${
                    isSpeaker
                      ? "bg-white text-black"
                      : "bg-white/10 text-white backdrop-blur-md"
                  }`}
                >
                  {isSpeaker ? (
                    <Volume2 className="w-7 h-7" />
                  ) : (
                    <VolumeX className="w-7 h-7" />
                  )}
                </button>
                <span className="text-xs text-gray-300 font-light">扬声器</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
