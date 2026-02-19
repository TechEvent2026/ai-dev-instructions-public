"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上である必要があります"),
  role: z.enum(["admin", "manager", "user"]).default("user"),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(
      z
        .string()
        .min(6, "パスワードは6文字以上である必要があります")
        .optional()
    ),
  role: z.enum(["admin", "manager", "user"]).default("user"),
});

export async function createUser(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: (formData.get("role") as string) || "user",
  };

  const validated = createUserSchema.parse(data);

  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser) {
    throw new Error("このメールアドレスは既に登録されています");
  }

  const hashedPassword = await bcrypt.hash(validated.password, 10);

  await prisma.user.create({
    data: {
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
      role: validated.role,
    },
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(id: string, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: (formData.get("role") as string) || "user",
  };

  const validated = updateUserSchema.parse(data);

  const existingUser = await prisma.user.findUnique({
    where: { email: validated.email },
  });

  if (existingUser && existingUser.id !== id) {
    throw new Error("このメールアドレスは既に他のユーザーに使用されています");
  }

  const updateData: { name: string; email: string; password?: string; role: string } = {
    name: validated.name,
    email: validated.email,
    role: validated.role,
  };

  if (validated.password) {
    updateData.password = await bcrypt.hash(validated.password, 10);
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({
    where: { id },
  });

  revalidatePath("/users");
}
