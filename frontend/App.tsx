import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Azınlık</Text>
      <Text style={styles.subtitle}>Kelime Oyunu</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Oyuna Başla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 22,
    marginBottom: 40,
    color: "#38bdf8",
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#022c22",
  },
});

