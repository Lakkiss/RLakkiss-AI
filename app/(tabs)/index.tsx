import { useEffect, useRef, useState } from 'react';
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
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';

const API_URL = 'https://rlakkiss-ai.onrender.com/chat';

type Language = 'en' | 'ar' | 'fr';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const translations = {
  en: {
    title: 'RLakkiss AI',
    subtitle: 'AI Assistant',
    placeholder: 'Message RLakkiss AI...',
    thinking: 'Thinking...',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    french: 'Français',
    photo: 'Photo',
    file: 'File',
    copy: 'Copy',
    copied: 'Copied!',
    photoPermission: 'Photo permission is required.',
    error: 'Could not connect to server.',
    speak: 'Speak',
    stop: 'Stop',
  },

  ar: {
    title: 'Lakkis AI',
    subtitle: 'المساعد الذكي',
    placeholder: 'اكتب رسالتك...',
    thinking: 'جاري التفكير...',
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    french: 'Français',
    photo: 'صورة',
    file: 'ملف',
    copy: 'نسخ',
    copied: 'تم النسخ!',
    photoPermission: 'يجب السماح بالوصول إلى الصور.',
    error: 'تعذر الاتصال بالخادم.',
    speak: 'استماع',
    stop: 'إيقاف',
  },

  fr: {
    title: 'Lakkis AI',
    subtitle: 'Assistant IA',
    placeholder: 'Écrivez votre message...',
    thinking: 'Réflexion...',
    language: 'Langue',
    english: 'English',
    arabic: 'العربية',
    french: 'Français',
    photo: 'Photo',
    file: 'Fichier',
    copy: 'Copier',
    copied: 'Copié !',
    photoPermission: 'L’autorisation des photos est requise.',
    error: 'Impossible de se connecter au serveur.',
    speak: 'Écouter',
    stop: 'Arrêter',
  },
};

const speechLanguages: Record<Language, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  fr: 'fr-FR',
};

export default function Index() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [showPlus, setShowPlus] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const t = translations[language];

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      }, 50);
    }
  }, [messages, loading]);

  async function copyMessage(text: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert(t.copied);
  }

  async function speakMessage(
    id: string,
    text: string
  ) {
    if (speakingId === id) {
      await Speech.stop();
      setSpeakingId(null);
      return;
    }

    await Speech.stop();
    setSpeakingId(id);

    Speech.speak(text, {
      language: speechLanguages[language],
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }

  async function pickImage() {
    setShowPlus(false);

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t.photoPermission);
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      setInput(old =>
        old
          ? `${old}\n[Image attached: ${
              asset.fileName || 'image'
            }]`
          : `[Image attached: ${
              asset.fileName || 'image'
            }]`
      );

      inputRef.current?.focus();
    }
  }

  async function pickFile() {
    setShowPlus(false);

    const result =
      await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

    if (!result.canceled && result.assets.length > 0) {
      const file = result.assets[0];

      setInput(old =>
        old
          ? `${old}\n[File attached: ${file.name}]`
          : `[File attached: ${file.name}]`
      );

      inputRef.current?.focus();
    }
  }

  function selectLanguage(lang: Language) {
    setLanguage(lang);
    setShowLanguages(false);
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || loading) {
      return;
    }

    Keyboard.dismiss();

    setShowPlus(false);
    setShowLanguages(false);

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
    };

    const history = messages.map(message => ({
      role: message.role,
      content: message.content,
    }));

    setMessages(old => [
      ...old,
      userMessage,
    ]);

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
            ...history,
            {
              role: 'user',
              content: text,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || 'Server error'
        );
      }

      const reply =
        typeof data?.reply === 'string' &&
        data.reply.trim()
          ? data.reply.trim()
          : 'No response received.';

      setMessages(old => [
        ...old,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: reply,
        },
      ]);
    } catch (error) {
      setMessages(old => [
        ...old,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: t.error,
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
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={0}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {t.title}
            </Text>

            <Text style={styles.subtitle}>
              {t.subtitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.languageButton}
            activeOpacity={0.7}
            onPress={() => {
              setShowLanguages(
                value => !value
              );
              setShowPlus(false);
            }}
          >
            <Text style={styles.languageIcon}>
              🌐
            </Text>
          </TouchableOpacity>
        </View>

        {/* LANGUAGE MENU */}
        {showLanguages && (
          <View style={styles.languageMenu}>
            <Text style={styles.menuTitle}>
              {t.language}
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                selectLanguage('en')
              }
            >
              <Text style={styles.menuText}>
                🇺🇸 {t.english}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                selectLanguage('ar')
              }
            >
              <Text style={styles.menuText}>
                🇱🇧 {t.arabic}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                selectLanguage('fr')
              }
            >
              <Text style={styles.menuText}>
                🇫🇷 {t.french}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CHAT */}
        <FlatList
          ref={listRef}
          style={styles.chat}
          data={messages}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.messages,
            messages.length === 0 &&
              styles.emptyMessages,
          ]}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageWrapper,
                item.role === 'user'
                  ? styles.userWrapper
                  : styles.aiWrapper,
              ]}
            >
              <View
                style={[
                  styles.message,
                  item.role === 'user'
                    ? styles.userMessage
                    : styles.aiMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    language === 'ar' &&
                      styles.arabicText,
                  ]}
                >
                  {item.content}
                </Text>
              </View>

              {item.role === 'assistant' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      copyMessage(item.content)
                    }
                  >
                    <Text style={styles.actionIcon}>
                      📋
                    </Text>

                    <Text style={styles.actionText}>
                      {t.copy}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      speakMessage(
                        item.id,
                        item.content
                      )
                    }
                  >
                    <Text style={styles.actionIcon}>
                      {speakingId === item.id
                        ? '⏹'
                        : '🔊'}
                    </Text>

                    <Text style={styles.actionText}>
                      {speakingId === item.id
                        ? t.stop
                        : t.speak}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>
                {t.title}
              </Text>

              <Text style={styles.welcomeText}>
                {language === 'ar'
                  ? 'كيف يمكنني مساعدتك؟'
                  : language === 'fr'
                  ? 'Comment puis-je vous aider ?'
                  : 'How can I help you?'}
              </Text>
            </View>
          }
        />

        {/* THINKING */}
        {loading && (
          <View style={styles.thinkingBox}>
            <ActivityIndicator size="small" />

            <Text style={styles.thinkingText}>
              {t.thinking}
            </Text>
          </View>
        )}

        {/* PLUS MENU */}
        {showPlus && (
          <View style={styles.plusMenu}>
            <TouchableOpacity
              style={styles.plusItem}
              onPress={pickImage}
            >
              <Text style={styles.plusIcon}>
                🖼️
              </Text>

              <Text style={styles.plusText}>
                {t.photo}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plusItem}
              onPress={pickFile}
            >
              <Text style={styles.plusIcon}>
                📎
              </Text>

              <Text style={styles.plusText}>
                {t.file}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.plusButton}
              activeOpacity={0.7}
              onPress={() => {
                setShowPlus(value => !value);
                setShowLanguages(false);
              }}
            >
              <Text style={styles.plusButtonText}>
                +
              </Text>
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.placeholder}
              placeholderTextColor="#888"
              multiline
              textAlignVertical="top"
              editable={!loading}
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) &&
                  styles.buttonDisabled,
              ]}
              onPress={sendMessage}
              disabled={
                !input.trim() || loading
              }
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator
                  color="#fff"
                  size="small"
                />
              ) : (
                <Text style={styles.sendText}>
                  ↑
                </Text>
              )}
            </TouchableOpacity>
          </View>
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

  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    color: '#777',
    marginTop: 2,
    fontSize: 13,
  },

  languageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  languageIcon: {
    fontSize: 21,
  },

  languageMenu: {
    position: 'absolute',
    top: 68,
    right: 15,
    zIndex: 50,
    width: 190,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  menuTitle: {
    fontWeight: '700',
    fontSize: 15,
    padding: 10,
  },

  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },

  menuText: {
    fontSize: 15,
    color: '#222',
  },

  chat: {
    flex: 1,
  },

  messages: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 18,
  },

  emptyMessages: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  welcome: {
    alignItems: 'center',
    paddingHorizontal: 25,
  },

  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },

  welcomeText: {
    fontSize: 17,
    color: '#777',
  },

  messageWrapper: {
    marginBottom: 14,
    maxWidth: '88%',
  },

  userWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },

  aiWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  message: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 17,
  },

  userMessage: {
    backgroundColor: '#222',
    borderBottomRightRadius: 5,
  },

  aiMessage: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 23,
    color: '#111',
  },

  arabicText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginRight: 4,
  },

  actionIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  actionText: {
    fontSize: 12,
    color: '#666',
  },

  thinkingBox: {
    minHeight: 34,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  thinkingText: {
    color: '#777',
    fontSize: 14,
    marginLeft: 8,
  },

  plusMenu: {
    position: 'absolute',
    bottom: 75,
    left: 10,
    zIndex: 40,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  plusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 140,
  },

  plusIcon: {
    fontSize: 21,
    marginRight: 10,
  },

  plusText: {
    fontSize: 16,
    color: '#222',
  },

  inputArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom:
      Platform.OS === 'android' ? 10 : 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  plusButtonText: {
    fontSize: 30,
    lineHeight: 32,
    color: '#222',
    fontWeight: '300',
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 16,
    lineHeight: 21,
    backgroundColor: '#fff',
    color: '#111',
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },

  sendText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: -3,
  },

  buttonDisabled: {
    opacity: 0.4,
  },
});