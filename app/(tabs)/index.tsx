import { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

'https://rlakkiss-ai.onrender.com/chat';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function Index() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((old) => [...old, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: text },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      setMessages((old) => [
        ...old,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'No response / ما وصلني جواب.',
        },
      ]);
    } catch {
      setMessages((old) => [
        ...old,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Could not connect to server. / ما قدرت اتصل بالسيرفر.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.title}>RLakkiss AI</Text>
        <Text style={styles.subtitle}>AI Assistant / المساعد الذكي</Text>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <View
              style={[
                styles.message,
                item.role === 'user'
                  ? styles.userMessage
                  : styles.aiMessage,
              ]}
            >
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question / اكتب سؤالك..."
            multiline
          />

          <TouchableOpacity
            style={styles.button}
            onPress={sendMessage}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Thinking...' : 'Send / إرسال'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 18,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  messages: {
    padding: 15,
    flexGrow: 1,
  },
  message: {
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#ddd',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  messageText: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    maxHeight: 100,
  },
  button: {
    backgroundColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});