# vonOndermann
---
Aplikacja która interpretuje kod przeznaczony dla przykładowej maszyny DC2 (Didactic Computer with 2 accumulators).

--- 
Spis instrukcji i metoda działania jest umieszczona w pliku Neumann.pdf

Link do aplikacji: [Link](https://vonneumann.azurewebsites.net/)

---

Przykładowe programy:

 - Program wyznaczający n-ty wyraz ciągu fibbonacciego
```
.UNIT, fibo   
.DATA   
  f0: .WORD, 0   
  f1: .WORD, 1
  n: .WORD, 20
  temp: .WORD, 0
.CODE
  load, @B, (n)
  jzero, koniec
  et2: sub, @B, 1
  jzero, koniec
  load, @A, (f0)
  add, @A, (f1)
  store, @A, temp
  load, @A, (f1)
  store, @A, f0
  load, @A, (temp)
  store, @A, f1
  jump, et2
  koniec: halt,
.END
```
 - Program znajdujący minimum w tablicy
```
.UNIT, minimum
.DATA
    t: .WORD, 23,34,34,23,5,46,45,2,70,11
    n: .WORD, 10
    adr: .WORD, t
    min: .WORD, 0
.CODE
    load, @B, (n)
    load, @A, ((adr))
    store, @A, min
et2:sub,@B,1
    jzero, et1
    load, @A, (adr)
    add, @A, 4
    store, @A, adr
    load, @A, ((adr))
    sub, @A, (min)
    jpos, et2
    jzero, et2
    add, @A, (min)
    store, @A, min
    jump, et2
et1:halt,
.END
```
