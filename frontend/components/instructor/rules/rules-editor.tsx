"use client"

import { useState } from "react"
import { CourseRules, RuleObject, RuleType } from "@/hooks/use-course-rules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { H4, Muted } from "@/components/primitives"
import { Trash2, Plus } from "lucide-react"

interface RulesEditorProps {
  rules: CourseRules | null
  onSave: (updatedRules: Partial<CourseRules>) => Promise<void>
  loading?: boolean
}

export function RulesEditor({ rules, onSave, loading }: RulesEditorProps) {
  const [goals, setGoals] = useState<string[]>(rules?.goals || [])
  const [promptRules, setPromptRules] = useState<RuleObject[]>(
    rules?.prompt_rules?.map(r => typeof r === "object" && "type" in r ? r : { type: "REQUEST" as RuleType, content: String(r) }) || []
  )
  const [outputRules, setOutputRules] = useState<RuleObject[]>(
    rules?.output_rules?.map(r => typeof r === "object" && "type" in r ? r : { type: "REQUEST" as RuleType, content: String(r) }) || []
  )
  const [fallbackPrompt, setFallbackPrompt] = useState(rules?.fallback_prompt || "")
  const [outputs, setOutputs] = useState<string[]>(rules?.outputs || [])

  const handleSave = async () => {
    await onSave({
      goals: goals.length > 0 ? goals : undefined,
      prompt_rules: promptRules.length > 0 ? promptRules : undefined,
      output_rules: outputRules.length > 0 ? outputRules : undefined,
      fallback_prompt: fallbackPrompt || undefined,
      outputs: outputs.length > 0 ? outputs : undefined,
    })
  }

  const addGoal = () => {
    setGoals([...goals, ""])
  }

  const updateGoal = (index: number, value: string) => {
    const updated = [...goals]
    updated[index] = value
    setGoals(updated)
  }

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index))
  }

  const addPromptRule = () => {
    setPromptRules([...promptRules, { type: "REQUEST", content: "" }])
  }

  const updatePromptRule = (index: number, field: "type" | "content", value: string) => {
    const updated = [...promptRules]
    updated[index] = { ...updated[index], [field]: value }
    setPromptRules(updated)
  }

  const removePromptRule = (index: number) => {
    setPromptRules(promptRules.filter((_, i) => i !== index))
  }

  const addOutputRule = () => {
    setOutputRules([...outputRules, { type: "REQUEST", content: "" }])
  }

  const updateOutputRule = (index: number, field: "type" | "content", value: string) => {
    const updated = [...outputRules]
    updated[index] = { ...updated[index], [field]: value }
    setOutputRules(updated)
  }

  const removeOutputRule = (index: number) => {
    setOutputRules(outputRules.filter((_, i) => i !== index))
  }

  const addOutput = () => {
    setOutputs([...outputs, ""])
  }

  const updateOutput = (index: number, value: string) => {
    const updated = [...outputs]
    updated[index] = value
    setOutputs(updated)
  }

  const removeOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
          <Muted text="Learning goals for this mode" />
        </CardHeader>
        <CardContent className="space-y-2">
          {goals.map((goal, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={goal}
                onChange={(e) => updateGoal(idx, e.target.value)}
                placeholder="Enter goal"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeGoal(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addGoal} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Goal
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Rules</CardTitle>
          <Muted text="Rules that apply to student prompts" />
        </CardHeader>
        <CardContent className="space-y-2">
          {promptRules.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <Select
                value={rule.type}
                onValueChange={(value) => updatePromptRule(idx, "type", value as RuleType)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REQUEST">REQUEST</SelectItem>
                  <SelectItem value="REQUIRE">REQUIRE</SelectItem>
                  <SelectItem value="DENY">DENY</SelectItem>
                  <SelectItem value="ALLOW">ALLOW</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={rule.content}
                onChange={(e) => updatePromptRule(idx, "content", e.target.value)}
                placeholder="Rule content"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePromptRule(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addPromptRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Prompt Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Output Rules</CardTitle>
          <Muted text="Rules that apply to assistant responses" />
        </CardHeader>
        <CardContent className="space-y-2">
          {outputRules.map((rule, idx) => (
            <div key={idx} className="flex gap-2">
              <Select
                value={rule.type}
                onValueChange={(value) => updateOutputRule(idx, "type", value as RuleType)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REQUEST">REQUEST</SelectItem>
                  <SelectItem value="REQUIRE">REQUIRE</SelectItem>
                  <SelectItem value="DENY">DENY</SelectItem>
                  <SelectItem value="ALLOW">ALLOW</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={rule.content}
                onChange={(e) => updateOutputRule(idx, "content", e.target.value)}
                placeholder="Rule content"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOutputRule(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addOutputRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Output Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fallback Prompt</CardTitle>
          <Muted text="Prompt to use when rules are violated" />
        </CardHeader>
        <CardContent>
          <Textarea
            value={fallbackPrompt}
            onChange={(e) => setFallbackPrompt(e.target.value)}
            placeholder="Enter fallback prompt"
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outputs</CardTitle>
          <Muted text="Expected output formats" />
        </CardHeader>
        <CardContent className="space-y-2">
          {outputs.map((output, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={output}
                onChange={(e) => updateOutput(idx, e.target.value)}
                placeholder="Enter output format"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOutput(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addOutput} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Output
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Rules"}
        </Button>
      </div>
    </div>
  )
}
