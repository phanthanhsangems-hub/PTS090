import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetch } from "expo/fetch";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    createConversation();
  }, []);

  async function createConversation() {
    try {
      const res = await apiRequest("POST", "/api/conversations", {
        title: "New Chat",
      });
      const data = await res.json();
      setConversationId(data.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming || !conversationId) return;

    setInputText("");
    const userMsg: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;
    const assistantId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ content: text }),
        },
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId,
                    role: "assistant",
                    content: parsed.content,
                  },
                ]);
                assistantAdded = true;
              } else {
                const captured = fullContent;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    id: assistantId,
                    role: "assistant",
                    content: captured,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      setShowTyping(false);
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [inputText, isStreaming, conversationId]);

  const handleNewChat = useCallback(async () => {
    setMessages([]);
    setConversationId(null);
    try {
      const res = await apiRequest("POST", "/api/conversations", {
        title: "New Chat",
      });
      const data = await res.json();
      setConversationId(data.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View
        style={[
          styles.messageBubble,
          item.role === "user" ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {item.role === "assistant" && (
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles" size={16} color="#6366f1" />
          </View>
        )}
        <View
          style={[
            styles.bubbleContent,
            item.role === "user"
              ? styles.userBubbleContent
              : styles.assistantBubbleContent,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              item.role === "user" && styles.userMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const renderTypingIndicator = useCallback(() => {
    if (!showTyping) return null;
    return (
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <View style={styles.avatarContainer}>
          <Ionicons name="sparkles" size={16} color="#6366f1" />
        </View>
        <View style={[styles.bubbleContent, styles.assistantBubbleContent]}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      </View>
    );
  }, [showTyping]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#c7c7cc" />
        </View>
        <Text style={styles.emptyTitle}>How can I help you?</Text>
        <Text style={styles.emptySubtitle}>
          Send a message to start a conversation
        </Text>
      </View>
    ),
    [],
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 },
        ]}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={22} color="#6366f1" />
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        <Pressable
          onPress={handleNewChat}
          style={styles.newChatButton}
          testID="new-chat-button"
        >
          <Ionicons name="create-outline" size={22} color="#6366f1" />
        </Pressable>
      </View>

      <FlatList
        data={[...messages].reverse()}
        inverted={messages.length > 0}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        ListHeaderComponent={renderTypingIndicator}
        ListEmptyComponent={renderEmpty}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={messages.length > 0}
        testID="chat-messages"
      />

      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom:
              Math.max(
                Platform.OS === "web" ? webBottomInset : insets.bottom,
                12,
              ) + 4,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#999"
            multiline
            maxLength={4000}
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
            editable={!isStreaming}
            testID="chat-input"
          />
          <Pressable
            onPress={() => {
              sendMessage();
              inputRef.current?.focus();
            }}
            disabled={!inputText.trim() || isStreaming}
            style={[
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
            ]}
            testID="send-button"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={!inputText.trim() || isStreaming ? "#ccc" : "#fff"}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#1a1a1a",
  },
  newChatButton: {
    padding: 8,
    borderRadius: 8,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageBubble: {
    flexDirection: "row",
    marginVertical: 4,
    maxWidth: "85%" as any,
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  assistantBubble: {
    alignSelf: "flex-start",
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  bubbleContent: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
  },
  userBubbleContent: {
    backgroundColor: "#6366f1",
  },
  assistantBubbleContent: {
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e8e8e8",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#1a1a1a",
    fontFamily: "Inter_400Regular",
  },
  userMessageText: {
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    gap: 8,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#1a1a1a",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#1a1a1a",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: "#e8e8e8",
  },
});
