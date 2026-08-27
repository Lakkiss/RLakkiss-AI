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
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';

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
    arabic: 'Arabic',
    french: 'French',
    photo: 'Photo',
    file: 'File',
    copy: 'Copy',
    copied: 'Copied!',
    cancel: 'Cancel',
    photoPermission: 'Photo permission is required.',
    error: 'Could not connect to server.',
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
    cancel: 'إلغاء',
    photoPermission: 'يجب السماح بالوصول إلى الصور.',
    error: 'تعذر الاتصال بالسيرفر.',
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
    cancel: 'Annuler',
    photoPermission: 'L’autorisation des photos est requise.',
    error: 'Impossible de se connecter au serveur.',
  },
};

export default function Index() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [language, setLanguage] = useState<Language>('en');
  const [showPlus, setShowPlus] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  const t = translations[language];

  async function copyMessage(text: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert(t.copied);
  }

  async function pickImage() {
    setShowPlus(false);

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t.photoPermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setInput(old =>
        old ? `${old}\n[Image attached]` : '[Image attached]'
      );
    }
  }

  async function pickFile() {
    setShowPlus(false);

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const file = result.assets[0];

      setInput(old =>
        old
          ? `${old}\n[File: ${file.name}]`
          : `[File: ${file.name}]`
      );
    }
  }

  function selectLanguage(lang: Language) {
    setLanguage(lang);
    setShowLanguages(false);
  }

  async function sendMessage() {
    const text = input.trim();

    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    const history = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    setMessages(old => [...old, userMessage]);
    setInput('');
    setLoading(true);
    setShowPlus(false);

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
        throw new Error(data.error || 'Server error');
      }

      setMessages(old => [
        ...old,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply || 'No response.',
        },
      ]);
    } catch (error) {
      setMessages(old => [
        ...old,
        {
          id: (Date.now() + 1).toString(),
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => {
              setShowLanguages(!showLanguages);
              setShowPlus(false);
            }}
          >
            <Text style={styles.languageIcon}>🌐</Text>
          </TouchableOpacity>
        </View>

        {/* LANGUAGE MENU */}
        {showLanguages && (
          <View style={styles.languageMenu}>
            <Text style={styles.menuTitle}>{t.language}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => selectLanguage('en')}
            >
              <Text style={styles.menuText}>🇬🇧 {t.english}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => selectLanguage('ar')}
            >
              <Text style={styles.menuText}>🇱🇧 {t.arabic}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => selectLanguage('fr')}
            >
              <Text style={styles.menuText}>🇫🇷 {t.french}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CHAT */}
        <FlatList
          style={styles.chat}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
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
                <Text style={styles.messageText}>
                  {item.content}
                </Text>
              </View>

              {/* COPY BUTTON ONLY FOR AI */}
              {item.role === 'assistant' && (
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyMessage(item.content)}
                >
                  <Text style={styles.copyIcon}>📋</Text>
                  <Text style={styles.copyText}>{t.copy}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        {/* THINKING */}
        {loading && (
          <View style={styles.thinkingBox}>
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
              <Text style={styles.plusIcon}>📷</Text>
              <Text style={styles.plusText}>{t.photo}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plusItem}
              onPress={pickFile}
            >
              <Text style={styles.plusIcon}>📎</Text>
              <Text style={styles.plusText}>{t.file}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>

            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => {
                setShowPlus(!showPlus);
                setShowLanguages(false);
              }}
            >
              <Text style={styles.plusButtonText}>＋</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t.placeholder}
              placeholderTextColor="#888"
              multiline
              textAlignVertical="top"
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || loading) &&
                  styles.buttonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Text style={styles.sendText}>
                {loading ? '...' : '↑'}
              </Text>
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
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
  },

  subtitle: {
    color: '#777',
    marginTop: 2,
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
    fontSize: 22,
  },

  languageMenu: {
    position: 'absolute',
    top: 65,
    right: 15,
    zIndex: 20,
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
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
  },

  chat: {
    flex: 1,
  },

  messages: {
    padding: 15,
    paddingBottom: 10,
  },

  messageWrapper: {
    marginBottom: 10,
    maxWidth: '85%',
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
    padding: 12,
    borderRadius: 16,
  },

  userMessage: {
    backgroundColor: '#ddd',
  },

  aiMessage: {
    backgroundColor: '#eee',
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  copyIcon: {
    fontSize: 15,
    marginRight: 5,
  },

  copyText: {
    fontSize: 13,
    color: '#666',
  },

  thinkingBox: {
    paddingHorizontal: 18,
    paddingVertical: 5,
  },

  thinkingText: {
    color: '#777',
    fontSize: 14,
  },

  plusMenu: {
    position: 'absolute',
    bottom: 75,
    left: 10,
    zIndex: 30,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  plusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 130,
  },

  plusIcon: {
    fontSize: 21,
    marginRight: 10,
  },

  plusText: {
    fontSize: 16,
  },

  inputArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
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
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
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
    fontSize: 25,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.4,
  },
});